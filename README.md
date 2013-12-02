fondosMutuosAPI
===============

fondos mutuos nodejs API

Configurar las credenciales de la base de datos mongo, editar el archivo ~/.bash_profile

```sh 
cat ~/.bash_profile
export MONGO_DEV_HOST=hostname_server
export MONGO_DEV_PORT=port_server
export MONGO_DEV_DB=collection
export MONGO_DEV_USERNAME=user
export MONGO_DEV_PASSWORD=password
export MONGO_DEV_URI=mongodb://${MONGO_DEV_USERNAME}:${MONGO_DEV_PASSWORD}@${MONGO_DEV_HOST}:${MONGO_DEV_PORT}/${MONGO_DEV_DB}
```

