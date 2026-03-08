FROM registry.access.redhat.com/ubi9/python-311

WORKDIR /opt/app-root/src

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN mkdir -p /opt/app-root/data && \
    chown 1001:0 /opt/app-root/data && \
    chmod 775 /opt/app-root/data

COPY charmr_backend/ ./charmr_backend/

WORKDIR /opt/app-root/src/charmr_backend

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
