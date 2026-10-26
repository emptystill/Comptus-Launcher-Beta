; Comptus - personalización del instalador (NSIS / electron-builder)
!include MUI2.nsh
!include nsDialogs.nsh
!include LogicLib.nsh
!include FileFunc.nsh

!ifndef BUILD_UNINSTALLER
!insertmacro GetParent
Var OptDesk
Var OptMenu
Var OptStart
Var ckDesk
Var ckMenu
Var ckStart
Var OptMedia
Var MediaPath
Var ckMedia
Var txtMedia
!endif

; Carpeta de instalación por defecto: Archivos de programa\Comptus\Comptus Launcher (solo si no hay una ya registrada)
!macro preInit
  SetRegView 64
  ReadRegStr $0 HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation
  ${If} $0 == ""
    WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$PROGRAMFILES64\Comptus\Comptus Launcher"
  ${EndIf}
  SetRegView 32
!macroend

!macro customInit
  !ifndef BUILD_UNINSTALLER
  StrCpy $OptDesk ${BST_CHECKED}
  StrCpy $OptMenu ${BST_CHECKED}
  StrCpy $OptStart ${BST_UNCHECKED}
  !endif
!macroend

!ifndef BUILD_UNINSTALLER
Function ComptusOptsCreate
  !insertmacro MUI_HEADER_TEXT "Personaliza tu instalación" "Elige cómo quieres tener Comptus en tu equipo."
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  ${NSD_CreateLabel} 0 0 100% 24u "Marca las opciones que prefieras. Podrás cambiarlas más adelante desde Windows."
  Pop $0
  ${NSD_CreateGroupBox} 0 30u 100% 76u "Accesos directos y arranque"
  Pop $0
  ${NSD_CreateCheckbox} 12u 46u 90% 12u "Crear acceso directo en el escritorio"
  Pop $ckDesk
  ${NSD_CreateCheckbox} 12u 62u 90% 12u "Crear acceso directo en el menú Inicio"
  Pop $ckMenu
  ${NSD_CreateCheckbox} 12u 78u 90% 12u "Abrir Comptus automáticamente al iniciar Windows"
  Pop $ckStart
  ${If} $OptDesk == ${BST_CHECKED}
    ${NSD_Check} $ckDesk
  ${EndIf}
  ${If} $OptMenu == ${BST_CHECKED}
    ${NSD_Check} $ckMenu
  ${EndIf}
  ${If} $OptStart == ${BST_CHECKED}
    ${NSD_Check} $ckStart
  ${EndIf}
  ${NSD_CreateLabel} 0 114u 100% 24u "Tus juegos, logros y temas se guardan aparte de la instalación: actualizar o desinstalar Comptus no los borra."
  Pop $0
  nsDialogs::Show
FunctionEnd

Function ComptusOptsLeave
  ${NSD_GetState} $ckDesk $OptDesk
  ${NSD_GetState} $ckMenu $OptMenu
  ${NSD_GetState} $ckStart $OptStart
FunctionEnd
!endif

!ifndef BUILD_UNINSTALLER
Function ComptusMediaBrowse
  nsDialogs::SelectFolderDialog "Elige dónde crear la carpeta «Comptus Media»" "$PROGRAMFILES64"
  Pop $0
  ${If} $0 != error
    ${NSD_SetText} $txtMedia "$0\Comptus Media"
  ${EndIf}
FunctionEnd

Function ComptusMediaCreate
  !insertmacro MUI_HEADER_TEXT "Carpeta para tus imágenes" "Portadas, banners, logos, iconos, fondos y tráilers propios."
  ${If} $MediaPath == ""
    ${GetParent} "$INSTDIR" $0
    StrCpy $MediaPath "$0\Comptus Media"
  ${EndIf}
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  ${NSD_CreateLabel} 0 0 100% 36u "Comptus puede crear una carpeta «Comptus Media» con subcarpetas (Portadas, Banners, Logos, Iconos, Collections Banners, Themes Wallpaper, Video - Trailers y Comptus Copias de seguridad) donde se guardan tus imágenes personalizadas. Está fuera de la carpeta del programa, así que actualizar o desinstalar no la borra."
  Pop $0
  ${NSD_CreateCheckbox} 0 44u 100% 12u "Crear la carpeta «Comptus Media»"
  Pop $ckMedia
  ${NSD_Check} $ckMedia
  ${NSD_CreateText} 0 62u 78% 12u "$MediaPath"
  Pop $txtMedia
  ${NSD_CreateButton} 80% 61u 20% 14u "Examinar…"
  Pop $0
  ${NSD_OnClick} $0 ComptusMediaBrowse
  ${NSD_CreateLabel} 0 82u 100% 24u "Si no la creas ahora, Comptus te preguntará dónde crearla cuando lo abras por primera vez."
  Pop $0
  nsDialogs::Show
FunctionEnd

Function ComptusMediaLeave
  ${NSD_GetState} $ckMedia $OptMedia
  ${NSD_GetText} $txtMedia $MediaPath
FunctionEnd
!endif

!macro customPageAfterChangeDir
  Page custom ComptusOptsCreate ComptusOptsLeave
  Page custom ComptusMediaCreate ComptusMediaLeave
!macroend

!macro customInstall
  !ifndef BUILD_UNINSTALLER
  ; Carpeta «Comptus Media» (solo si se eligió en la pantalla del instalador; en actualizaciones silenciosas no se toca)
  ${If} $OptMedia == ${BST_CHECKED}
    CreateDirectory "$MediaPath"
    nsExec::Exec 'icacls "$MediaPath" /grant *S-1-5-32-545:(OI)(CI)M /T'
    Pop $0
    SetRegView 64
    WriteRegStr HKLM "Software\Comptus" "MediaDir" "$MediaPath"
    SetRegView 32
  ${ElseIf} $OptMedia == ${BST_UNCHECKED}
    SetRegView 64
    DeleteRegValue HKLM "Software\Comptus" "MediaDir"
    SetRegView 32
  ${EndIf}
  ${If} $OptDesk == ${BST_CHECKED}
    CreateShortCut "$DESKTOP\Comptus.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
  ${EndIf}
  ${If} $OptMenu == ${BST_CHECKED}
    CreateShortCut "$SMPROGRAMS\Comptus.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
  ${EndIf}
  ${If} $OptStart == ${BST_CHECKED}
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Comptus" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}"'
  ${Else}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Comptus"
  ${EndIf}
  !endif
!macroend

!macro customUnInstall
  Delete "$DESKTOP\Comptus.lnk"
  Delete "$SMPROGRAMS\Comptus.lnk"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Comptus"
!macroend
