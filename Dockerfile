# Use the official PostgreSQL image as a base
FROM postgres:17-alpine


# Set environment variables for PostgreSQL
ENV POSTGRES_USER=drizzle_user
ENV POSTGRES_PASSWORD=drizzle_password
ENV POSTGRES_DB=drizzle_db

# Expose the PostgreSQL port
EXPOSE 5432

# Optionally, you can add an init script to create tables or seed data
# COPY ./init.sql /docker-entrypoint-initdb.d/