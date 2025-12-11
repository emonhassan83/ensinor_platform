# Use official PostgreSQL image as base
FROM postgres:15

# Set environment variables (optional)
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=123456
ENV POSTGRES_DB=ensinor

# Copy initialization scripts (if any) into Docker
# COPY ./init-db.sh /docker-entrypoint-initdb.d/

# Expose PostgreSQL port
EXPOSE 5432
