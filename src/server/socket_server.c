/**
 * socket_server.c - Simple socket server implementation
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <sys/select.h>
#include <sys/time.h>
#include <netinet/in.h>
#include <pthread.h>
#include "socket_server.h"
#include "proc_core.h"
#include "proc_history.h"

#define MAX_CLIENTS 30
#define BUFFER_SIZE 4096
#define JSON_BUFFER_SIZE 8192

static int server_fd = -1;
static int client_sockets[MAX_CLIENTS];
static int num_clients = 0;
static volatile int running = 1;

// Initialize all client sockets to 0
static void init_client_sockets() {
    for (int i = 0; i < MAX_CLIENTS; i++) {
        client_sockets[i] = 0;
    }
}

// Helper function to escape JSON strings
static void json_escape_string(char *dest, const char *src, size_t dest_size) {
    size_t i, j;
    for (i = 0, j = 0; src[i] && j < dest_size - 1; i++) {
        if (src[i] == '"' || src[i] == '\\') {
            if (j < dest_size - 2) {
                dest[j++] = '\\';
                dest[j++] = src[i];
            }
        } else if (src[i] == '\n') {
            if (j < dest_size - 2) {
                dest[j++] = '\\';
                dest[j++] = 'n';
            }
        } else {
            dest[j++] = src[i];
        }
    }
    dest[j] = '\0';
}

// Handle GetProcesses request
static char* handle_get_processes() {
    char *response = malloc(JSON_BUFFER_SIZE);
    if (!response) return NULL;
    
    // Start JSON object with request_type
    int offset = snprintf(response, JSON_BUFFER_SIZE, "{\"request_type\":\"%s\",\"pids\":[", MSG_GET_PROCESSES);
    
    // Get actual process information
    if (proc_collect_info() >= 0) {
        const proc_info_t *proc_list = proc_get_list();
        int proc_count = proc_get_count();
        
        // Add each PID to the array
        for (int i = 0; i < proc_count; i++) {
            int remaining = JSON_BUFFER_SIZE - offset;
            int written;
            if (i < proc_count - 1) {
                written = snprintf(response + offset, remaining, "%d,", proc_list[i].pid);
            } else {
                written = snprintf(response + offset, remaining, "%d", proc_list[i].pid);
            }
            if (written >= remaining) {
                // Buffer full, truncate
                break;
            }
            offset += written;
        }
    }
    
    // Close JSON object
    snprintf(response + offset, JSON_BUFFER_SIZE - offset, "]}");
    return response;
}

// Handle GetSimpleProcessDetails request
static char* handle_simple_process_details(int pid) {
    char *response = malloc(JSON_BUFFER_SIZE);
    char name_escaped[256];
    if (!response) return NULL;
    
    // Start with request_type and pid
    snprintf(response, JSON_BUFFER_SIZE, "{\"request_type\":\"%s\",\"pid\":%d", MSG_GET_SIMPLE_DETAILS, pid);
    
    // Get actual process information
    if (proc_collect_info() >= 0) {
        const proc_info_t *proc_list = proc_get_list();
        int proc_count = proc_get_count();
        
        // Find the process with matching PID
        for (int i = 0; i < proc_count; i++) {
            if (proc_list[i].pid == pid) {
                // Escape strings for JSON
                json_escape_string(name_escaped, proc_list[i].name, sizeof(name_escaped));
                
                // Calculate uptime
                time_t now = time(NULL);
                unsigned long uptime = now - proc_list[i].start_time;
                
                // Add process details - use a simplified user group based on PID range
                const char *user_group = (pid <= 100) ? "System" : 
                                       (pid <= 1000) ? "User" : "Background";
                
                // Add process details
                snprintf(response + strlen(response), JSON_BUFFER_SIZE - strlen(response),
                    ",\"name\":\"%s\",\"user\":\"%s\",\"uptime\":%lu,"
                    "\"cpu_usage\":%.2f,\"ram_usage\":%lu",
                    name_escaped, user_group, uptime,
                    proc_list[i].cpu_usage, proc_list[i].memory_usage);
                break;
            }
        }
    }
    
    // Close JSON object
    strcat(response, "}");
    return response;
}

// Handle GetDetailedProcessDetails request
static char* handle_detailed_process_details(int pid) {
    char *response = malloc(JSON_BUFFER_SIZE);
    if (!response) return NULL;
    
    // Start JSON object with request_type and pid
    int offset = snprintf(response, JSON_BUFFER_SIZE, 
                         "{\"request_type\":\"%s\",\"pid\":%d,\"entries\":[", 
                         MSG_GET_DETAILED_DETAILS, pid);
    
    // Get actual process information and add to history
    if (proc_collect_info() >= 0) {
        const proc_info_t *proc_list = proc_get_list();
        int proc_count = proc_get_count();
        
        // Find the process with matching PID
        for (int i = 0; i < proc_count; i++) {
            if (proc_list[i].pid == pid) {
                // Add current data to history
                proc_history_add_entry(pid, proc_list[i].cpu_usage, proc_list[i].memory_usage);
                
                // Get historical entries
                proc_history_entry_t history_entries[MAX_HISTORY_ENTRIES];
                int entry_count = proc_history_get_entries(pid, history_entries, MAX_HISTORY_ENTRIES);
                
                // Add all historical entries to the response
                for (int j = 0; j < entry_count; j++) {
                    int remaining = JSON_BUFFER_SIZE - offset;
                    int written = snprintf(response + offset, remaining,
                        "%s{\"cpu_usage\":%.2f,\"ram_usage\":%lu,\"timestamp\":%ld}",
                        j > 0 ? "," : "",
                        history_entries[j].cpu_usage,
                        history_entries[j].memory_usage,
                        (long)history_entries[j].timestamp);
                    
                    if (written >= remaining) {
                        // Buffer full, truncate
                        break;
                    }
                    offset += written;
                }
                break;
            }
        }
    }
    
    // Close JSON array and object
    snprintf(response + offset, JSON_BUFFER_SIZE - offset, "]}");
    return response;
}

// Handle SuspendProcess request
static char* handle_suspend_process(int pid) {
    char *response = malloc(JSON_BUFFER_SIZE);
    if (!response) return NULL;
    
    // Attempt to suspend the process
    int success = (proc_adjust_priority(pid, 0, 0) == 0);
    
    snprintf(response, JSON_BUFFER_SIZE, 
            "{\"request_type\":\"%s\",\"pid\":%d,\"success\":%s}", 
            MSG_SUSPEND_PROCESS, pid, success ? "true" : "false");
    
    return response;
}

// Process incoming message
static void process_message(int client_socket, const char* message) {
    // Simple JSON parsing
    char *request_type = NULL;
    int pid = -1;
    
    // Look for request_type
    char *type_start = strstr(message, "\"request_type\":\"");
    if (type_start) {
        type_start += 15; // Skip "request_type":"
        char *type_end = strchr(type_start, '"');
        if (type_end) {
            size_t type_len = type_end - type_start;
            request_type = malloc(type_len + 1);
            if (request_type) {
                strncpy(request_type, type_start, type_len);
                request_type[type_len] = '\0';
            }
        }
    }
    
    // Look for PID if needed
    char *pid_start = strstr(message, "\"PID\":");
    if (pid_start) {
        pid_start += 6; // Skip "PID":
        pid = atoi(pid_start);
    }
    
    char *response = NULL;
    
    if (request_type) {
        if (strcmp(request_type, MSG_GET_PROCESSES) == 0) {
            response = handle_get_processes();
        }
        else if (strcmp(request_type, MSG_GET_SIMPLE_DETAILS) == 0 && pid >= 0) {
            response = handle_simple_process_details(pid);
        }
        else if (strcmp(request_type, MSG_GET_DETAILED_DETAILS) == 0 && pid >= 0) {
            response = handle_detailed_process_details(pid);
        }
        else if (strcmp(request_type, MSG_SUSPEND_PROCESS) == 0 && pid >= 0) {
            response = handle_suspend_process(pid);
        }
        
        free(request_type);
    }
    
    if (response) {
        socket_server_send(client_socket, response);
        free(response);
    }
}

static void* socket_thread(void* UNUSED_arg) {
    fd_set read_fds;
    int max_sd, activity, new_socket, valread;
    char buffer[BUFFER_SIZE];
    struct sockaddr_in address;
    int addrlen = sizeof(address);
    
    while (running) {
        FD_ZERO(&read_fds);
        FD_SET(server_fd, &read_fds);
        max_sd = server_fd;
        
        for (int i = 0; i < MAX_CLIENTS; i++) {
            int sd = client_sockets[i];
            if (sd > 0) {
                FD_SET(sd, &read_fds);
                if (sd > max_sd) max_sd = sd;
            }
        }
        
        struct timeval tv = {1, 0};
        activity = select(max_sd + 1, &read_fds, NULL, NULL, &tv);
        
        if (activity < 0) {
            perror("select error");
            continue;
        }
        
        if (FD_ISSET(server_fd, &read_fds)) {
            if ((new_socket = accept(server_fd, (struct sockaddr *)&address, (socklen_t*)&addrlen)) < 0) {
                perror("accept");
                continue;
            }
            
            for (int i = 0; i < MAX_CLIENTS; i++) {
                if (client_sockets[i] == 0) {
                    client_sockets[i] = new_socket;
                    printf("New connection, socket fd is %d\n", new_socket);
                    num_clients++;
                    break;
                }
            }
        }
        
        for (int i = 0; i < MAX_CLIENTS; i++) {
            int sd = client_sockets[i];
            
            if (FD_ISSET(sd, &read_fds)) {
                if ((valread = read(sd, buffer, BUFFER_SIZE)) == 0) {
                    close(sd);
                    client_sockets[i] = 0;
                    num_clients--;
                    printf("Client disconnected\n");
                } else {
                    buffer[valread] = '\0';
                    process_message(sd, buffer);
                }
            }
        }
    }
    
    return NULL;
}

int socket_server_init(int port) {
    struct sockaddr_in address;
    pthread_t thread_id;
    int opt = 1;
    
    init_client_sockets();
    
    if ((server_fd = socket(AF_INET, SOCK_STREAM, 0)) == 0) {
        perror("socket failed");
        return -1;
    }
    
    if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt))) {
        perror("setsockopt");
        return -1;
    }
    
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(port);
    
    if (bind(server_fd, (struct sockaddr *)&address, sizeof(address)) < 0) {
        perror("bind failed");
        return -1;
    }
    
    if (listen(server_fd, 3) < 0) {
        perror("listen");
        return -1;
    }
    
    // Initialize process history module
    if (proc_history_init() < 0) {
        printf("Failed to initialize process history module\n");
        return -1;
    }
    
    if (pthread_create(&thread_id, NULL, socket_thread, NULL) != 0) {
        perror("pthread_create");
        return -1;
    }
    
    printf("Socket server initialized on port %d\n", port);
    return 0;
}

int socket_server_send(int client_socket, const char* message) {
    if (!message) return -1;
    return send(client_socket, message, strlen(message), 0);
}

void socket_server_broadcast(const char* message) {
    if (!message) return;
    
    for (int i = 0; i < MAX_CLIENTS; i++) {
        if (client_sockets[i] != 0) {
            socket_server_send(client_sockets[i], message);
        }
    }
}

void socket_server_shutdown() {
    running = 0;
    
    for (int i = 0; i < MAX_CLIENTS; i++) {
        if (client_sockets[i] > 0) {
            close(client_sockets[i]);
            client_sockets[i] = 0;
        }
    }
    
    if (server_fd >= 0) {
        close(server_fd);
        server_fd = -1;
    }
    
    // Cleanup process history
    proc_history_shutdown();
}