# ACT-RENTAL Launcher Assets

This directory contains resources for the ACT-RENTAL Launcher application:

- Icons
- Images
- Other static files

## Application Icon

For creating an application icon (.icns file for macOS), you can use the iconutil utility:

1. Create a folder named icon.iconset
2. Place images of different sizes with the following names:
   - icon_16x16.png
   - icon_32x32.png
   - icon_64x64.png
   - icon_128x128.png
   - icon_256x256.png
   - icon_512x512.png
   - icon_1024x1024.png
3. Execute the command:
   ```
   iconutil -c icns icon.iconset
   ```
4. Move the resulting icon.icns to this directory

## DMG Background

When creating a DMG distribution, you can customize the appearance with a background image:

1. Create a background image (PNG or JPG) with a recommended size of 1000x640 pixels
2. Save it in this directory as `dmg_background.png`
3. Use it in the create-dmg command:
   ```
   create-dmg \
       --background "assets/dmg_background.png" \
       --volname "ACT-RENTAL Launcher" \
       --volicon "assets/icon.icns" \
       ...
   ```

## Application UI Resources

This directory may also contain UI resources used by the application:

- Logo images
- Status icons
- Button images

To add a resource to the application, place it in this directory and reference it in the code.
