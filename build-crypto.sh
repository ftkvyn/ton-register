#!/bin/bash
rm ./dist/*.*
rm ./temp/*.fif
func -AP -O0 -o ./dist/new-register-programm.fif ./src/crypto/lib/stdlib.fc ./src/crypto/register.fc

cp ./src/crypto/new-mark.fif ./dist/new-mark.fif
cp ./src/crypto/new-student.fif ./dist/new-student.fif

cat ./dist/new-register-programm.fif ./src/crypto/test/const_code.fif ./src/crypto/test/init-c7.fif ./src/crypto/test/test-1_script.fif > ./temp/test-1.fif
cat ./dist/new-register-programm.fif ./src/crypto/test/const_code.fif ./src/crypto/test/init-c7.fif ./src/crypto/test/test-2_script.fif > ./temp/test-2.fif
cat ./dist/new-register-programm.fif ./src/crypto/test/const_code.fif ./src/crypto/test/init-c7.fif ./src/crypto/test/test-3_script.fif > ./temp/test-3.fif
cat ./dist/new-register-programm.fif ./src/crypto/test/const_code.fif ./src/crypto/test/init-c7.fif ./src/crypto/test/test-4_script.fif > ./temp/test-4.fif
cat ./dist/new-register-programm.fif ./src/crypto/new-register_script.fif > ./dist/new-register.fif


mkdir -p temp
cd temp
fift -s ./test-1.fif
fift -s ./test-2.fif
fift -s ./test-3.fif
fift -s ./test-4.fif