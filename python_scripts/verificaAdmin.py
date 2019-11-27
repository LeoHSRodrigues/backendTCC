#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
PyFingerprint
Copyright (C) 2015 Bastian Raschke <bastian.raschke@posteo.de>
All rights reserved.

"""

import hashlib
from pyfingerprint import PyFingerprint
import io
import sys

chr = input().split("lplplp")
digital = list(map(int, chr[0].split(",")))

digital1 = list(map(int, chr[1].split(" ")))


# Tries to initialize the sensor
try:
    f = PyFingerprint('COM4', 115200, 0xFFFFFFFF, 0x00000000)

    if ( f.verifyPassword() == False ):
        raise ValueError('The given fingerprint sensor password is wrong!')

except Exception as e:
    print('The fingerprint sensor could not be initialized!')
    print('Exception message: ' + str(e))
    exit(1)

# Tenta registrar digital
try:
    f.uploadCharacteristics(0x01, digital)
    f.uploadCharacteristics(0x02, digital1)

    print(f.compareCharacteristics())

except Exception as e:
    print('Operation failed!')
    print('Exception message: ' + str(e))
    exit(1)
