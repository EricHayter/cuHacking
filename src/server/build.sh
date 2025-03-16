#!/bin/bash
 
source /usr/local/qnx/env/bin/activate
source $HOME/qnx800/qnxsdp-env.sh
 
cd $HOME/qnxprojects/cuHacking/src/server/
 
ntoaarch64-gcc -o proc-monitor -I. proc-monitor.c proc_core.c proc_group.c proc_history.c socket_server.c