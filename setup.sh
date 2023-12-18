#!/usr/bin/env sh
yarn pandora 
cp -r ./pandora/data /data
mkdir -p /root/.cache/PandoraNext
cp -r ./pandora/sessions /root/.cache/PandoraNext