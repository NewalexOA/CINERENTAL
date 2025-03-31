FROM ubuntu:22.04

# Avoid prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install apt-cacher-ng
RUN apt-get update && \
    apt-get install -y apt-cacher-ng && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Configure apt-cacher-ng
RUN echo "PassThroughPattern: .*" >> /etc/apt-cacher-ng/acng.conf && \
    echo "BindAddress: 0.0.0.0" >> /etc/apt-cacher-ng/acng.conf

# Expose the port
EXPOSE 3142

# Start apt-cacher-ng
CMD ["/usr/sbin/apt-cacher-ng", "ForeGround=1", "Debug=3"]
