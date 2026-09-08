@echo off
title Servidor Local para Celular - Suite PERT CPM
echo ======================================================================
echo           SUITE INTEGRAL PERT - CPM - PROBABILIDAD
echo               SERVIDOR DE ACCESO PARA CELULARES
echo ======================================================================
echo.
echo Para abrir la app en tu telefono celular o tablet:
echo 1. Asegurate de que tu celular este conectado al mismo Wi-Fi.
echo 2. Abre el navegador de tu celular (Chrome, Safari, Edge, etc.).
echo 3. Ingresa la siguiente direccion:
echo.
echo           http://192.168.18.78:8080
echo.
echo ======================================================================
echo Servidor activo. No cierres esta ventana mientras uses el celular.
echo Para detener el servidor, presiona Ctrl + C o cierra esta ventana.
echo ======================================================================
echo.
python -m http.server 8080 --bind 0.0.0.0
pause
