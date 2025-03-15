# Makefile for QNX Process Monitor
#
# This Makefile manages the build process for the QNX Process Monitor application.
# It handles building the application inside a Docker container with the QNX
# development environment, ensuring that the container is running, and providing
# various utility targets for development and testing.

# Docker-related variables
# -----------------------
# Name of the Docker container to use for building
DOCKER_CONTAINER = qnx-build
# Path to the project directory inside the Docker container
WORKSPACE_PATH = /workspace/src/server
# Docker image to use for the container
DOCKER_IMAGE = qnx800:latest

# Project files
# ------------
# Source files to compile
SRCS = proc-monitor.c proc_core.c proc_group.c

# Default target: checks if container is running and starts it if needed
# ---------------------------------------------------------------------
# This is the default target that runs when 'make' is called without arguments
all: ensure-container
	docker exec -it \
		-w /workspace \
		$(DOCKER_CONTAINER) bash -c "source /usr/local/qnx/env/bin/activate && \
		source ~/qnx800/qnxsdp-env.sh && \
		cd src/server && \
		make build-in-container"

# Check if container is running, start if not
# ------------------------------------------
# This target ensures that the Docker container is running before attempting to build
ensure-container:
	@echo "Checking if container $(DOCKER_CONTAINER) is running..."
	@if [ -z "$$(docker ps -q -f name=$(DOCKER_CONTAINER))" ]; then \
		echo "Container $(DOCKER_CONTAINER) is not running, starting..."; \
		if [ -z "$$(docker ps -aq -f name=$(DOCKER_CONTAINER))" ]; then \
			echo "Container does not exist, creating it..."; \
			cd ../docker-mac && ./docker-create-container.sh; \
		else \
			echo "Starting existing container..."; \
			docker start $(DOCKER_CONTAINER); \
		fi \
	else \
		echo "Container $(DOCKER_CONTAINER) is already running."; \
	fi

# Target used inside the container
# -------------------------------
# This target is called by the 'all' target inside the Docker container
build-in-container:
	@echo "Building for QNX..."
	@echo "QNX_TARGET: $(QNX_TARGET)"
	@echo "QNX_HOST: $(QNX_HOST)"
	@echo "Using QNX compiler directly with full paths"
	QNX_CONFIGURATION="$${QNX_CONFIGURATION:-$${QNX_TARGET}/etc/qconfig}" \
	$(QNX_HOST)/usr/bin/ntoaarch64-gcc \
		-D__QNXNTO__ -Wall -Wextra \
		-I$(QNX_TARGET)/usr/include \
		-I$(QNX_TARGET)/usr/include/aarch64 \
		-I$(QNX_TARGET)/usr/include/aarch64/le \
		-o proc-monitor $(SRCS) -I.

# Build QNX image
# --------------
# This target builds a QNX OS image with the application
build-image: ensure-container
	docker exec -it \
		$(DOCKER_CONTAINER) bash -c "source /usr/local/qnx/env/bin/activate && \
		source ~/qnx800/qnxsdp-env.sh && \
		cd $(WORKSPACE_PATH) && \
		./build-image.sh"

# Check QNX installation
# ---------------------
# This target checks the QNX installation in the Docker container
check-qnx: ensure-container
	docker exec -it $(DOCKER_CONTAINER) bash -c "source /usr/local/qnx/env/bin/activate && \
		source ~/qnx800/qnxsdp-env.sh && \
		cd $(WORKSPACE_PATH) && \
		echo 'QNX_TARGET: $$QNX_TARGET' && \
		echo 'QNX_HOST: $$QNX_HOST' && \
		echo 'QNX_CONFIGURATION: $$QNX_CONFIGURATION' && \
		echo 'Checking available QNX headers:' && \
		ls -la $$QNX_TARGET/usr/include/sys/ | grep -E 'sched|proc|neutrino' && \
		echo 'Available QNX tools:' && \
		ls -la $$QNX_HOST/usr/bin/ntoaarch64* && \
		echo 'Checking host environment variables:' && \
		env | grep -i qnx && \
		bash"

# Run the application inside the Docker container
# ---------------------------------------------
# This target runs the built application inside the Docker container
run: ensure-container
	docker exec -it $(DOCKER_CONTAINER) bash -c "cd $(WORKSPACE_PATH) && ./proc-monitor"

# Shell access inside the container
# -------------------------------
# This target provides a shell inside the Docker container for manual operations
shell: ensure-container
	docker exec -it $(DOCKER_CONTAINER) bash -c "source /usr/local/qnx/env/bin/activate && source ~/qnx800/qnxsdp-env.sh && cd $(WORKSPACE_PATH) && bash"

# Clean up build artifacts
# ----------------------
# This target removes built files
clean: ensure-container
	docker exec -it $(DOCKER_CONTAINER) bash -c "cd $(WORKSPACE_PATH) && rm -f proc-monitor *.o"

# Help target
# ----------
# This target displays help information about available targets
help:
	@echo "QNX Process Monitor"
	@echo ""
	@echo "Available targets:"
	@echo "  all           - Build project in QNX Docker container (default)"
	@echo "  run           - Run built application in container"
	@echo "  build-image   - Build QNX image"
	@echo "  clean         - Remove built files"
	@echo "  shell         - Open shell in container"
	@echo "  check-qnx     - Check QNX installation and available headers"
	@echo "  help          - Show this help message"

# Declare phony targets (targets that don't create files)
.PHONY: all ensure-container build-in-container build-image run shell clean check-qnx help