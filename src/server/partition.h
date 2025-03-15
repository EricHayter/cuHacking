#ifndef PARTITION_H
#define PARTITION_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>

/* These includes will be available in QNX environment */
#ifdef __QNXNTO__
#include <sys/part.h>
#include <sys/rsrcdbmgr.h>
#endif

#define MAX_NAME_LEN 128
#define PART_MAX_PARTITIONS 8

/* Partition information structure */
typedef struct {
    int id;
    char name[MAX_NAME_LEN];
    unsigned budget;
    unsigned critical;
    unsigned maximum;
    unsigned used;
    unsigned cycles_used;
} partition_info_t;

/* Partition module interface */
int partition_init(void);
void partition_shutdown(void);
int partition_collect_info(void);
int partition_get_count(void);
const partition_info_t *partition_get_list(void);
void partition_display_info(void);
int partition_adjust_budget(int id, unsigned new_budget);
int partition_find_process(pid_t pid, int *partition_id);

#endif /* PARTITION_H */

