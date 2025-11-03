# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['generate_docs.py'],
    pathex=[],
    binaries=[],
    datas=[('enseignansParSeance.docx', '.'), ('Convocation.docx', '.')],
    hiddenimports=['docx', 'pandas', 'openpyxl', 'docx.shared', 'docx.enum.text', 'docx.oxml', 'docx2pdf'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='generate_docs',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
