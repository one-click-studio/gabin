NAME=gabin
PROJECT=$NAME-$1
BIN_PATH=./dist/
ICON_PATH=./src/resources/icons/icon.png

# Clean the .app folder
rm -rf $BIN_PATH/$PROJECT.app

# Create the .app folder
mkdir -p $BIN_PATH/$PROJECT.app/Contents/MacOS
mkdir -p $BIN_PATH/$PROJECT.app/Contents/Resources

# Copy the executable
cp $BIN_PATH/$PROJECT $BIN_PATH/$PROJECT.app/Contents/MacOS/$NAME

# Create icons
ICONDIR=$BIN_PATH/$PROJECT.app/Contents/Resources/$NAME.iconset
mkdir $ICONDIR

# Normal screen icons
for SIZE in 16 32 64 128 256 512; do
sips -z $SIZE $SIZE $ICON_PATH --out $ICONDIR/icon_${SIZE}x${SIZE}.png ;
done

# Retina display icons
for SIZE in 32 64 256 512; do
sips -z $SIZE $SIZE $ICON_PATH --out $ICONDIR/icon_$(expr $SIZE / 2)x$(expr $SIZE / 2)x2.png ;
done

# Make a multi-resolution Icon
iconutil -c icns -o $BIN_PATH/$PROJECT.app/Contents/Resources/iconfile.icns $ICONDIR
rm -rf $ICONDIR #it is useless now

touch $BIN_PATH/$PROJECT.app

# Create the Info.plist file
cat > $BIN_PATH/$PROJECT.app/Contents/Info.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>English</string>
    <key>CFBundleExecutable</key>
    <string>$NAME</string>
    <key>CFBundleIconFile</key>
    <string>iconfile</string>
    <key>CFBundleIdentifier</key>
    <string>com.oneclickstudio.$NAME</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$NAME</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

echo "Done! ❤️"