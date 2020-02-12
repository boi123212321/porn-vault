#!/bin/bash
# We want a configuration file in /config so it can be stored in a persistant volume and not whiped out if we update the container.
# Check if this symlink exists
if [ ! -L config.yaml ]
then
	if [ ! -f /config/config.yaml ]
	then
		echo "copying example configuration"
		mv config.yaml.example /config/config.yaml
		ln -s config/config.yaml config.yaml
	fi
fi
if [ ! -d /videos ]
then
	mkdir /videos
fi
if [ ! -d images ]
then
	mkdir /images
fi
/porn-manager
