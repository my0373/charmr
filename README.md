# Charmr
Sports Event Manager

# Testing setup
## Create the docker / podman network

In order for the containers to communicate, we create a docker/ podman network to allow the containers to communicate with each other using DNS.

```bash
docker network create charmr
```

## Configure Postgres
### Pull the Postgres 17 image

Create the data directory to use as a container mount point for the database.
```bash
mkdir -p ${HOME}/charmr/data/
```

Export some environment variables for the container images

```bash
export POSTGRES_USER="charmr"
export POSTGRES_PASSWORD="postgres12345"
export PGADMIN_PASSWORD="postgres12345"
export PGADMIN_DEFAULT_EMAIL="root@charmr.org"
export POSTGRES_DATA_MOUNT="${HOME}/charmr/data"
export PGADMIN_DATA_MOUNT="${HOME}/charmr/pgadmin"

```

Attempt to run the container image.

```bash
docker run -d \
        --name charmr-postgres \
        -e POSTGRES_USER=${POSTGRES_USER} \
        -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
        -e PGDATA=/var/lib/postgresql/data/pgdata \
        -v ${POSTGRES_DATA_MOUNT}:/var/lib/postgresql/data:Z \
        --replace \
        --network=charmr \
        -p 5432:5432  \
        postgres:17
```

Optional: Set up PGAdmin
```bash
mkdir -p ${HOME}/charmr/pgadmin/
```

```bash
docker run -d \
        --name charmr-pgadmin \
        -e PGADMIN_DEFAULT_EMAIL=${PGADMIN_DEFAULT_EMAIL} \
        -e PGADMIN_DEFAULT_PASSWORD=${PGADMIN_DEFAULT_PASSWORD} \
        -v ${PGADMIN_DATA_MOUNT}:/pgadmin4:Z \
        --replace \
        --network=charmr \
        -p 8081:80  \
        dpage/pgadmin4
```

You can then create a connection with the following settings by logging into

http://127.0.0.1:8081/

with the username
```root@charmr.org```
and the password  ```postgres12345```

Create a new connection.
```
hostname: charmr-postgres
username: charmr
password: postgres12345
```
Optional: Set up a local psql client

On Fedora you can install the local client.
```
sudo dnf install postgresql
```
Attempt to connect to the postgres container.

```
psql -h 127.0.0.1 -p 5432 --username=charmr --password
```
Note: If you ever want to delete the database, just stop the container and clear out the ```pgdata``` directory in ```${POSTGRES_DATA_MOUNT}```


## Configure static content container
```bash
docker build -t charmr-static .
```

```bash
docker run --name charmr-static -d -p 8085:80 \
 -v ${HOME}/charmr/static/:/usr/share/nginx/html/:Z \
 --network=charmr \
 --replace \
 charmr-static
```

## Configure Django container

 docker run --name charmr-backend -d \
 -v ${HOME}/charmr/charmr-backend/src/charmr/:/app:Z \
 --network=charmr \
 -p 8000:8000 \
 --replace \
 charmr-backend


## Create the database
 docker run --name charmr-dbmigrate -d \
 -v ${HOME}/charmr/charmr-backend/src/charmr/:/app:Z \
 --network=charmr \
 --replace charmr-dbmigrate

