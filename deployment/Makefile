.PHONY: help build-server build-client build-all up down restart logs clean prune

help:
	@echo "Available commands:"
	@echo "  make build-server  - Build server Docker image"
	@echo "  make build-client  - Build client Docker image"
	@echo "  make build-all     - Build both images"
	@echo "  make up            - Start all containers"
	@echo "  make down          - Stop all containers"
	@echo "  make restart       - Restart all containers"
	@echo "  make logs          - Show container logs"
	@echo "  make clean         - Remove containers and images"
	@echo "  make prune         - Remove all unused Docker resources"

build-server:
	@echo "Building server image..."
	docker build -f docker/server.Dockerfile -t fullstack-app-server:latest ../..

build-client:
	@echo "Building client image..."
	docker build -f docker/client.Dockerfile -t fullstack-app-client:latest ../..

build-all: build-server build-client
	@echo "All images built successfully!"

up:
	docker-compose up -d
	@echo "Containers started. Access:"
	@echo "  Frontend: http://localhost:80"
	@echo "  Backend:  http://localhost:8000"

down:
	docker-compose down

restart: down up

logs:
	docker-compose logs -f

logs-server:
	docker-compose logs -f server

logs-client:
	docker-compose logs -f client

clean:
	docker-compose down -v
	docker rmi fullstack-app-server:latest fullstack-app-client:latest || true

prune:
	docker system prune -af --volumes