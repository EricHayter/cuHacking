#ifndef PROC_CORE_H
#define PROC_CORE_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <time.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <dirent.h>
#include <pthread.h>

#ifdef __QNXNTO__
#include <sys/neutrino.h>
#include <sys/netmgr.h>
#include <sys/procfs.h>
#include <sys/sched.h>
#include <sys/dcmd_proc.h>
#endif

#define PROC_PATH "/proc"
#define MAX_PROCS 256
#define MAX_PATH_LEN 256
#define MAX_NAME_LEN 128

/* Process information structure */
typedef struct {
    pid_t pid;
    char name[MAX_NAME_LEN];
    int partition_id;
    unsigned long memory_usage;
    double cpu_usage;
    unsigned int priority;
    int policy;
    int num_threads;
    unsigned long long runtime;
    time_t start_time;
    int state;
} proc_info_t;

/*Process module interface*/
int proc_core_init(void);
void proc_core_shutdown(void);
int proc_collect_info(void);
int proc_get_count(void);
const proc_info_t *proc_get_list(void);
void proc_display_info(void);
int proc_adjust_priority(pid_t pid, int priority, int policy);

/* Thread synchronization interface*/
int proc_core_mutex_lock(void);
int proc_core_mutex_unlock(void);

#endif /* PROC_CORE_H */




