FROM maven:3.9.8-eclipse-temurin-21-alpine AS build
WORKDIR /app
# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -q
# Copy source and build (skip JOOQ codegen in Docker — use pre-generated or skip tests)
COPY src ./src
RUN mvn clean package -DskipTests -Djooq.codegen.skip=true

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/schoolos-backend-*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
