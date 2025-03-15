# Get the relative path from the project root to this directory
MAKEFILE_PATH := $(abspath $(lastword $(MAKEFILE_LIST)))
MAKEFILE_DIR := $(dir $(MAKEFILE_PATH))

default:
	docker exec -it \
		-w /workspace \
		qnx-build bash -c "source /usr/local/qnx/env/bin/activate && \
		source ~/qnx800/qnxsdp-env.sh && \
		cd src/server && \
		./build.sh"

.PHONY: default 