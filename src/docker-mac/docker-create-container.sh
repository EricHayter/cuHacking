#!/bin/bash

QNX_SDP_VERSION=qnx800

# Get the project root directory (2 levels up from this script)
PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)

docker create -it --name=qnx-build \
  --platform linux/amd64 \
  --net=host \
  --privileged \
  -v $HOME:/home/$USER/ \
  -v $PROJECT_ROOT:/workspace \
  "$QNX_SDP_VERSION:latest" /bin/bash --rcfile /usr/local/qnx/.qnxbashrc

docker start qnx-build