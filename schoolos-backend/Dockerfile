# syntax=docker/dockerfile:1
FROM maven:3.9.8-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Install Docker CLI so Testcontainers can spin up PostgreSQL for JOOQ codegen
RUN apk add --no-cache docker-cli

# Cache dependencies first
COPY pom.xml .
RUN mvn dependency:go-offline -q

COPY src ./src

# Mount Docker socket so Testcontainers can start a PostgreSQL container for JOOQ codegen
RUN --mount=type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock \
    mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/schoolos-backend-*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
