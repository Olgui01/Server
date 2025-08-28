sudo nano /etc/systemd/system/api.service
//////////////////////////////////////////////////////////////////
[Unit]
Description=Up Server App (Docker Compose)
Requires=docker.service
After=docker.service

[Service]
WorkingDirectory=/home/ubuntu/up_server   # carpeta donde está tu docker-compose.yml
ExecStart=/usr/bin/docker start server
ExecStop=/usr/bin/docker stop server
Restart=always
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
/////////////////////////////////////////////////////
sudo systemctl enable api
sudo systemctl start api
////////////////////////////////////////////////
sudo systemctl status api
