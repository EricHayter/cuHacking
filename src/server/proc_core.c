/**
 * @file proc_core.c
 * @brief Implementation of the Process Management Core Module
 *
 * This file implements the process management functionality defined in proc_core.h.
 * It provides mechanisms for collecting, storing, and displaying information about
 * processes running on the system. The implementation includes both QNX-specific
 * code (when compiled for QNX) and a simplified fallback for non-QNX systems.
 */

#include "proc_core.h"
#include "proc_group.h"

/* Static data */
/**
 * @brief Array of process information structures
 *
 * This static array stores information about all processes in the system.
 * The array is populated by proc_collect_info().
 */
static proc_info_t proc_list[MAX_PROCS];

/**
 * @brief Current number of processes
 *
 * Tracks how many entries in the proc_list array are valid.
 */
static int proc_count = 0;

/**
 * @brief Mutex for thread-safe access to process data
 *
 * Ensures that multiple threads can safely access and modify the proc_list array.
 */
static pthread_mutex_t data_mutex = PTHREAD_MUTEX_INITIALIZER;

/**
 * @brief Lock the process data mutex
 *
 * Acquires exclusive access to the process data structures.
 * This should be called before accessing process data from external modules.
 *
 * @return 0 on success, non-zero on failure
 */
int proc_core_mutex_lock(void) {
    return pthread_mutex_lock(&data_mutex);
}

/**
 * @brief Unlock the process data mutex
 *
 * Releases exclusive access to the process data structures.
 * This should be called after accessing process data from external modules.
 *
 * @return 0 on success, non-zero on failure
 */
int proc_core_mutex_unlock(void) {
    return pthread_mutex_unlock(&data_mutex);
}

/**
 * @brief Initialize the process core module
 *
 * Currently, this function doesn't need to perform any special initialization,
 * but it's included for API completeness and potential future extensions.
 *
 * @return 0 on success, non-zero on failure
 */
int proc_core_init(void) {
    /* Nothing special to initialize for now */
    return 0;
}

/**
 * @brief Clean up resources used by the process core module
 *
 * Destroys the mutex used for thread synchronization.
 */
void proc_core_shutdown(void) {
    pthread_mutex_destroy(&data_mutex);
}

#ifdef __QNXNTO__
/**
 * @brief Collect information about all processes (QNX-specific implementation)
 *
 * This function scans the /proc directory to find all running processes,
 * then collects detailed information about each one. The information is
 * stored in the proc_list array for later retrieval.
 *
 * @return Number of processes found, or negative value on error
 */
int proc_collect_info(void) {
    DIR *dir;                /* Directory handle for /proc */
    struct dirent *entry;    /* Directory entry */
    char path[MAX_PATH_LEN]; /* Buffer for constructing file paths */
    int count = 0;           /* Counter for number of processes found */
    
    /* Lock the mutex to ensure thread safety */
    pthread_mutex_lock(&data_mutex);
    
    /* Open the /proc directory */
    dir = opendir(PROC_PATH);
    if (!dir) {
        perror("opendir");
        pthread_mutex_unlock(&data_mutex);
        return -1;
    }
    
    /* Iterate through all entries in the /proc directory */
    while ((entry = readdir(dir)) != NULL && count < MAX_PROCS) {
        /* Skip non-numeric entries (not PIDs) */
        if (entry->d_name[0] < '0' || entry->d_name[0] > '9')
            continue;
            
        /* Convert the directory name to a PID */
        pid_t pid = atoi(entry->d_name);
        
        /* Store the process ID */
        proc_list[count].pid = pid;
        
        /* Get process name from cmdline file */
        char cmdline[MAX_NAME_LEN];
        snprintf(path, sizeof(path), "%s/%d/cmdline", PROC_PATH, pid);
        int cmd_fd = open(path, O_RDONLY);
        if (cmd_fd >= 0) {
            /* Read the command line */
            int len = read(cmd_fd, cmdline, sizeof(cmdline) - 1);
            if (len > 0) {
                cmdline[len] = '\0';
                /* Extract base command name (remove arguments) */
                char *end = strchr(cmdline, ' ');
                if (end) *end = '\0';
                /* Extract base command name (remove path) */
                char *base = strrchr(cmdline, '/');
                strncpy(proc_list[count].name, base ? base + 1 : cmdline, MAX_NAME_LEN - 1);
                proc_list[count].name[MAX_NAME_LEN - 1] = '\0';
            } else {
                strcpy(proc_list[count].name, "unknown");
            }
            close(cmd_fd);
        } else {
            strcpy(proc_list[count].name, "unknown");
        }
        
        /* Get memory usage from status file */
        snprintf(path, sizeof(path), "%s/%d/status", PROC_PATH, pid);
        FILE *status_file = fopen(path, "r");
        if (status_file) {
            char line[256];
            while (fgets(line, sizeof(line), status_file)) {
                unsigned long vmsize;
                /* Look for the VmSize line in the status file */
                if (sscanf(line, "VmSize: %lu", &vmsize) == 1) {
                    proc_list[count].memory_usage = vmsize * 1024; /* Convert KB to bytes */
                    break;
                }
            }
            fclose(status_file);
        } else {
            proc_list[count].memory_usage = 0;
        }
        
        /* Get CPU usage - simplified implementation */
        proc_list[count].cpu_usage = 0.0;
        proc_list[count].runtime = 0;
        
        /* Get scheduling info - simplified implementation */
        proc_list[count].priority = 10; /* Default priority */
        proc_list[count].policy = SCHED_RR; /* Default policy */
        
        /* Get thread count - simplified implementation */
        proc_list[count].num_threads = 1;
        
        /* Get group ID by calling into the process group module */
        proc_list[count].group_id = 0; /* Default group */
        proc_group_find_process(pid, &proc_list[count].group_id);
        
        /* Other info */
        proc_list[count].start_time = time(NULL); /* Current time as approximation */
        proc_list[count].state = 0; /* Unknown state */
        
        /* Increment the process counter */
        count++;
    }
    
    /* Clean up and update the process count */
    closedir(dir);
    proc_count = count;
    pthread_mutex_unlock(&data_mutex);
    
    return count;
}

#else
/**
 * @brief Collect information about all processes (non-QNX implementation)
 *
 * This is a simplified implementation for non-QNX systems that creates
 * a single dummy process entry for testing purposes.
 *
 * @return Number of processes found (always 1 in this implementation)
 */
int proc_collect_info(void) {
    /* Lock the mutex to ensure thread safety */
    pthread_mutex_lock(&data_mutex);
    
    /* Create a single dummy process entry for the current process */
    proc_list[0].pid = getpid();
    strcpy(proc_list[0].name, "proc-monitor");
    proc_list[0].group_id = 0;
    proc_list[0].memory_usage = 1024 * 1024; /* 1MB */
    proc_list[0].cpu_usage = 0.5;
    proc_list[0].priority = 10;
    proc_list[0].policy = 0;
    proc_list[0].num_threads = 1;
    proc_list[0].runtime = 0;
    proc_list[0].start_time = time(NULL);
    proc_list[0].state = 0;
    
    /* Set the process count to 1 */
    proc_count = 1;
    pthread_mutex_unlock(&data_mutex);
    
    return proc_count;
}
#endif

/**
 * @brief Get the current number of processes
 *
 * @return Number of processes currently tracked
 */
int proc_get_count(void) {
    return proc_count;
}

/**
 * @brief Get the list of processes
 *
 * @return Pointer to the internal array of proc_info_t structures
 */
const proc_info_t *proc_get_list(void) {
    return proc_list;
}

/**
 * @brief Display information about all processes to the console
 *
 * Formats and prints a table showing details of all processes, including
 * their PID, name, group ID, memory usage, CPU usage, priority, and thread count.
 */
void proc_display_info(void) {
    int i;

    /* Lock the mutex to ensure thread safety */
    pthread_mutex_lock(&data_mutex);

    /* Print the table header */
    printf("\n--- Process Information (Total: %d) ---\n", proc_count);
    printf("%-8s %-20s %-10s %-10s %-8s %-10s %-8s\n", 
           "PID", "Name", "Group", "Memory(KB)", "CPU%", "Priority", "Threads");
    printf("-------------------------------------------------------------------------\n");
    
    /* Print information for each process */
    for (i = 0; i < proc_count; i++) {
        printf("%-8d %-20s %-10d %-10lu %-8.2f %-10u %-8d\n", 
               proc_list[i].pid, 
               proc_list[i].name, 
               proc_list[i].group_id,
               proc_list[i].memory_usage / 1024, /* Convert bytes to KB */
               proc_list[i].cpu_usage,
               proc_list[i].priority,
               proc_list[i].num_threads);
    }
    
    /* Unlock the mutex */
    pthread_mutex_unlock(&data_mutex);
}

/**
 * @brief Adjust the priority and scheduling policy of a process
 *
 * This is a placeholder implementation that doesn't actually change
 * process priorities. In a full QNX implementation, it would use the
 * SchedSet() function to modify scheduling parameters.
 *
 * @param pid The process ID to modify (unused)
 * @param priority The new priority value to set (unused)
 * @param policy The new scheduling policy to set (unused)
 * @return Always returns -1 (not implemented)
 */
int proc_adjust_priority(pid_t pid, int priority, int policy) {
#ifdef __QNXNTO__
    /* In a full QNX implementation, we would use SchedSet() */
    printf("Priority adjustment not implemented in this version\n");
#else
    printf("Priority adjustment not available on non-QNX systems\n");
#endif
    return -1;
} 