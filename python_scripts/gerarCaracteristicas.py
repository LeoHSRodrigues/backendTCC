#!/usr/bin/env python

# -*- coding: utf-8 -*-

"""

PyFingerprint

Copyright (C) 2015 Bastian Raschke <bastian.raschke@posteo.de>

All rights reserved.

"""

import time

from pyfingerprint import PyFingerprint

# Inicializando o leitor

try:

    f = PyFingerprint('/dev/ttyS2', 115200, 0xFFFFFFFF, 0x00000000)

    if (f.verifyPassword() == False):

        raise ValueError('The given fingerprint sensor password is wrong!')


except Exception as e:

    print('The fingerprint sensor could not be initialized!')

    print('Exception message: ' + str(e))

    exit(1)

f.setSecurityLevel(5)


# Tenta registrar digital

try:

    print('Aproxime o dedo...')

    # Aguardando reconhecer dedo no leitor

    while (f.readImage() == False):

        pass

    # Converter a imagem lida para caracteristicas e salva no 1 buffer

    f.convertImage(0x01)

    print('Remova o dedo...')

    time.sleep(2)

    print('Aproxime o dedo novamente...')

    # Aguardando reconhecer dedo no leitor

    while (f.readImage() == False):

        pass

    # Converts read image to characteristics and stores it in charbuffer 2

    f.convertImage(0x02)

    # Compara com o dedo anteriormente inserido

    if (f.compareCharacteristics() == 0):

        raise Exception('Dedos Diferentes')

    # Cria o template

    f.createTemplate()

    # Salva as caracteristicas

    positionNumber = f.downloadCharacteristics()

    print('Leitura completada com sucesso!')

    print(positionNumber)


except Exception as e:

    print('Operation failed!')

    print('Exception message: ' + str(e))

    exit(1)
