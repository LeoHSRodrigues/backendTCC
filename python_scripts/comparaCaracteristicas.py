#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
PyFingerprint
Copyright (C) 2015 Bastian Raschke <bastian.raschke@posteo.de>
All rights reserved.

"""

import hashlib
from pyfingerprint import PyFingerprint

chr = []

## Tries to initialize the sensor
try:
    f = PyFingerprint('/dev/ttyS2', 115200, 0xFFFFFFFF, 0x00000000)

    if ( f.verifyPassword() == False ):
        raise ValueError('The given fingerprint sensor password is wrong!')

except Exception as e:
    print('The fingerprint sensor could not be initialized!')
    print('Exception message: ' + str(e))
    exit(1)

# Tenta registrar digital
try:
    print('Aproxime o dedo...')

    ## Wait that finger is read
    while ( f.readImage() == False ):
        pass

    ## Converts read image to characteristics and stores it in charbuffer 1
    f.convertImage(0x01)

    f.uploadCharacteristics(0x02, chr)

    print(f.compareCharacteristics())


except Exception as e:
    print('Operation failed!')
    print('Exception message: ' + str(e))
    exit(1)
