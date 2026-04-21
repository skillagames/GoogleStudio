const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

const permissions = `
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
`;

if (fs.existsSync(manifestPath)) {
    let manifest = fs.readFileSync(manifestPath, 'utf8');
    
    // Check if permissions block exists
    if (!manifest.includes('android.permission.CAMERA')) {
        const insertAfter = '<!-- Permissions -->';
        if (manifest.includes(insertAfter)) {
            manifest = manifest.replace(insertAfter, insertAfter + permissions);
        } else {
            // Fallback: insert before </manifest>
            manifest = manifest.replace('</manifest>', permissions + '\n</manifest>');
        }
        
        fs.writeFileSync(manifestPath, manifest);
        console.log('✅ AndroidManifest.xml updated with native permissions.');
    } else {
        console.log('ℹ️ Permissions already present in AndroidManifest.xml.');
    }
} else {
    console.error('❌ Could not find AndroidManifest.xml at: ' + manifestPath);
    process.exit(1);
}
