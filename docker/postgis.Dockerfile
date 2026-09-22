# postgres:16 + PostGIS. The official postgis/postgis images are linux/amd64 only,
# so they do not run on arm64; postgresql-16-postgis-3 comes from the PGDG repository
# that the base image already configures.
FROM postgres:16

RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-16-postgis-3 \
    && rm -rf /var/lib/apt/lists/*
