# Dockerfile
FROM nvidia/cuda:12.0.0-base-ubuntu22.04

# Ustawienie zmiennych środowiskowych
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/Warsaw

# Instalacja Python i potrzebnych pakietów systemowych
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-dev \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Ustawienie katalogu roboczego
WORKDIR /app

# Stworzenie struktury katalogów
RUN mkdir -p static templates

# Kopiowanie plików aplikacji
COPY requirements.txt .
COPY app.py .
COPY templates/index.html templates/
COPY static/main.css static/
COPY static/script.js static/

# Instalacja zależności Pythona
RUN pip3 install --no-cache-dir -r requirements.txt

# Ustawienie zmiennych środowiskowych dla Flask
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# Ekspozycja portu
EXPOSE 5000

# Ustawienie odpowiednich uprawnień
RUN chmod -R 755 /app

# Uruchomienie aplikacji
CMD ["python3", "app.py"]
