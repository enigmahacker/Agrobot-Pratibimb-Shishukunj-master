# AgroBot Backend

AI-powered backend service for the agricultural rover system with pesticide calculation and agronomy assistance.

## Features

- FastAPI web framework
- RESTful API endpoints
- Pesticide dose calculation
- Agronomic recommendations
- Weather integration
- Spray session validation
- Authentication and security
- API documentation (Swagger UI)

## Getting Started

### Prerequisites

- Python 3.8+
- Docker (optional, for containerized deployment)

### Installation

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Copy and configure the environment file:
```bash
cp .env.example .env
# Edit .env to set your configuration values
```

### Running the Application

1. Run with Uvicorn:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

2. Or run in development mode:
```bash
python -m app.main
```

### API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## Endpoints

### Health Check
- `GET /health` - Health status
- `GET /status` - Detailed service status

### Rover
- `GET /v1/rover/profile` - Rover profile information
- `GET /v1/rover/status` - Current rover status

### Agronomy
- `POST /v1/agronomy/recommendation` - Get agronomic recommendations
- `POST /v1/agronomy/calculate` - Calculate pesticide application

### Pesticide
- `POST /v1/pesticide/calculate` - Calculate pesticide dose

### Weather
- `GET /v1/weather/current` - Get current weather
- `GET /v1/weather/forecast` - Get weather forecast

### Spray Sessions
- `POST /v1/spray-sessions/validate` - Validate spray session parameters
- `GET /v1/spray-sessions/{session_id}` - Get spray session details

## Testing

Run tests with:
```bash
pytest app/tests/
```

## Deployment

To deploy using Docker:
```bash
docker build -t agrobot-backend .
docker run -p 8000:8000 agrobot-backend
```

## Security

- API authentication via JWT tokens
- Environment-based configuration
- Input validation and sanitization
- Rate limiting

## License

MIT License