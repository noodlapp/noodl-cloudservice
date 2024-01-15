# Noodl Cloud Services Docker

This package contains the docker image of the Noodl Self Hosted Cloud Service.

## Health Endpoints

```
# The application is up and running.
/health/live

# The application is ready to serve requests.
/health/ready

# Accumulating all health check procedures in the application.
/health
```

## Environment variables

### `PORT`

**Description**: The **`PORT`** variable defines the port number on which the application will run. It is the entry point for incoming network traffic.

**Default Value: `3000`**

### `DATABASE_URI`

**Description**: The **`DATABASE_URI`** variable specifies the Uniform Resource Identifier (URI) for connecting to the database. It includes information such as the database type, host, port, username, password, and database name.

**Example: `mongodb://username:password@localhost:27017/mydatabase`**

### `MASTER_KEY`

**Description**: The **MASTER_KEY** is a security credential that grants unrestricted access to the application's resources. It is a sensitive piece of information and should be kept confidential.

**Security Note**: Keep the **MASTER_KEY** secure and do not expose it publicly.

### `APP_ID`

**Description**: The **`APP_ID`** variable uniquely identifies the application within the system. It is used for authentication and authorization purposes.

**Example: `myApp123`**

### `CLOUD_FUNCTIONS_TIMEOUT`

**Description**: The **`CLOUD_FUNCTIONS_TIMEOUT`** variable sets the maximum time (in seconds) allowed for the execution of cloud functions. If a function exceeds this time limit, it may be terminated.

**Default Value: `15`** in seconds

### `CLOUD_FUNCTIONS_MEMORY_LIMIT`

**Description**: The **`CLOUD_FUNCTIONS_MEMORY_LIMIT`** variable determines the maximum amount of memory (in megabytes) that a cloud function is allowed to consume during execution.

**Default Value: `256`** in MB

### `MAX_UPLOAD_SIZE`

**Description**: The **`MAX_UPLOAD_SIZE`** variable specifies the maximum allowed size for file uploads in the application.

**Default Value: `20mb`**
