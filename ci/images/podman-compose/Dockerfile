FROM quay.io/podman/stable:latest
RUN echo "fastestmirror=1" >> /etc/dnf/dnf.conf

RUN dnf install -y podman-compose
RUN dnf install -y \
https://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm \
https://download1.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-$(rpm -E %fedora).noarch.rpm
RUN dnf install -y ffmpeg
