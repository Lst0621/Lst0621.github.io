#!/bin/bash

sed -i 's/_SL[0-9]\+_\.//g' resource/lib_of_hj.psv
sed -i 's/_SL[0-9]\+_\.//g' resource/reading.psv

git diff resource
