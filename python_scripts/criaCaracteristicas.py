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

    f = PyFingerprint('COM4', 115200, 0xFFFFFFFF, 0x00000000)

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

    f.createTemplate()

    # Salva as caracteristicas

    positionNumber = f.downloadCharacteristics()

    print(positionNumber)


except Exception as e:

    print('Operation failed!')

    print('Exception message: ' + str(e))

    exit(1)
