# Cross-platform path handling
ifeq ($(OS),Windows_NT)
	CONTAINER_PATH=/home/$${USER}/cuhacking/src/server
else
	CONTAINER_PATH=/home/$${USER}/Documents/Coding/cuHacking/src/server
endif

default:
	docker exec -it qnx-build bash -c "source /usr/local/qnx/env/bin/activate && \
		source ~/qnx800/qnxsdp-env.sh && \
		cd /home/$(shell whoami)/Documents/Coding/cuHacking/src/server && \
		./build.sh"

.PHONY: default 