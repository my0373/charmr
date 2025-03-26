#!/bin/bash
##########################################
# Charmr clean setup quick start script  #
##########################################
set -x
## Settings

# Set Charmr base directory
export CHARMR_BASE="${HOME}/charmr"

# Docker binary
#export DOCKER=/opt/homebrew/bin/docker
export DOCKER=/opt/podman/bin/podman

# Docker network
export DOCKER_NETWORK="charmr"

# Postgres settings
export POSTGRES_USER="charmr"
export POSTGRES_PASSWORD="postgres12345"
export POSTGRES_DATA_MOUNT="${CHARMR_BASE}/data"
export POSTGRES_IMAGE="postgres:17"

# PGAdmin settings
export PGADMIN_PASSWORD="postgres12345"
export PGADMIN_DEFAULT_EMAIL="root@charmr.org"


function kill_all_charmr_containers {
	# kill all of the charmr containers
	${DOCKER} ps | grep charmr |  awk '{ print $1 }' | grep -iv container | xargs podman kill
}
## Define the setup functions
function create_docker_network {
    # create the local container network
    ${DOCKER} network create ${DOCKER_NETWORK}
}

function create_postgres_container {

# Create the postgres data volume mount location
mkdir -p ${POSTGRES_DATA_MOUNT}

# Start the container image
${DOCKER} run -d \
        --name charmr-postgres \
        -e POSTGRES_USER=${POSTGRES_USER} \
        -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
        -e PGDATA=/var/lib/postgresql/data/pgdata \
        -v ${POSTGRES_DATA_MOUNT}:/var/lib/postgresql/data:Z \
        --replace \
        --network=${DOCKER_NETWORK} \
        -p 5432:5432  \
        ${POSTGRES_IMAGE}

}

function create_pgadmin_container {
	${DOCKER} run -d \
        --name charmr-pgadmin \
        -e PGADMIN_DEFAULT_EMAIL=${PGADMIN_DEFAULT_EMAIL} \
        -e PGADMIN_DEFAULT_PASSWORD=${PGADMIN_PASSWORD} \
        --replace \
        --network=${DOCKER_NETWORK} \
        -p 8081:80  \
        dpage/pgadmin4
}

function build_charmr_static_server {
	cd ${CHARMR_BASE}/static/

	${DOCKER} build -t charmr-static . 
}

function run_charmr_static_server {

	${DOCKER} run --name charmr-static -d -p 8085:80 \
 	-v ${CHARMR_BASE}/static/:/usr/share/nginx/html/:Z \
 	--network=${DOCKER_NETWORK} \
 	--replace \
 	charmr-static
}

function display_running_containers {
	${DOCKER} ps 
}

## Actual setup
create_docker_network
create_postgres_container
create_pgadmin_container
build_charmr_static_server
run_charmr_static_server
display_running_containers
