"""Script for building the CINERENTAL Launcher application using py2app."""

from setuptools import setup

APP = ['src/main.py']
DATA_FILES = [
    ('assets', ['assets/README.md']),
]
OPTIONS = {
    'argv_emulation': False,
    'packages': ['PyQt5'],
    'includes': [
        'sip',
        'typing',
        'sys',
        'os',
        'subprocess',
        'logging',
        'json',
        're',
        'datetime',
        'email',
    ],
    'excludes': [
        'tkinter',
        'distutils',
        'unittest',
        'test',
        'PySide2',
        'PySide6',
        'PyQt6',
    ],
    'strip': False,  # Disable stripping to help with debugging
    'iconfile': None,  # You can add an icon file path here if available
    'resources': [],
    'plist': {
        'CFBundleName': 'CINERENTAL Launcher',
        'CFBundleDisplayName': 'CINERENTAL Launcher',
        'CFBundleVersion': '1.0.0',
        'CFBundleShortVersionString': '1.0.0',
        'CFBundleIdentifier': 'com.cinerental.launcher',
        'NSHumanReadableCopyright': 'Copyright © 2023',
        'NSHighResolutionCapable': True,
        'NSRequiresAquaSystemAppearance': False,
        'LSBackgroundOnly': False,
        'LSEnvironment': {'PYTHONIOENCODING': 'UTF-8'},
        'LSUIElement': False,
        'NSPrincipalClass': 'NSApplication',
        'NSAppleScriptEnabled': False,
    },
}

setup(
    name='CINERENTAL Launcher',
    app=APP,
    data_files=DATA_FILES,
    options={'py2app': OPTIONS},
    setup_requires=['py2app'],
    install_requires=[
        'PyQt5',
    ],
)
