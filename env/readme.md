# Sample env file

Create a file named `.env.<name>` (e.g., `.env.test`) and place it in this directory. Copy the below properties and populate them with the appropriate values for that environment. Make sure not to commit any env files to the repository. The gitignore is already setup to ignore any files containing `.env` in their name.

```
# Optional, set to 'false' to turn logging off
LOGS=

# The port number the app will listen on
PORT=

# Database settings
DATABASE_TYPE=
DATABASE_HOST=
DATABASE_PORT=
DATABASE_USER=
DATABASE_PASS=
DATABASE_NAME=

# Token secret keys
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=

# Lifetime of the tokens (e.g., 30s, 15m, 1h, 7d, etc.)
JWT_ACCESS_EXPIRE=
JWT_REFRESH_EXPIRE=
```
