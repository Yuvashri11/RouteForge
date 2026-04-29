FROM prom/prometheus:v2.54.1

COPY prometheus.yml /etc/prometheus/prometheus.yml

CMD ["/bin/sh", "-c", "exec /bin/prometheus --config.file=/etc/prometheus/prometheus.yml --storage.tsdb.path=/prometheus --web.listen-address=0.0.0.0:${PORT:-9090}"]