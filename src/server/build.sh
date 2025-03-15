#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Source QNX environment if available
if [ -f "/usr/local/qnx/env/bin/activate" ]; then
    source /usr/local/qnx/env/bin/activate
fi

if [ -f "$HOME/qnx800/qnxsdp-env.sh" ]; then
    source $HOME/qnx800/qnxsdp-env.sh
fi

# Compile the proc-monitor
ntoaarch64-gcc -o proc-monitor proc-monitor.c

# Check if compilation was successful
if [ $? -eq 0 ]; then
    echo "Successfully compiled proc-monitor"
else
    echo "Error: Compilation failed"
    exit 1
fi