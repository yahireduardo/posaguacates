#ifndef StageDir
  #define StageDir "..\dist\POS-Aguacates-1.1.11"
#endif

[Setup]
AppId={{C4F4BDB3-922F-4AD5-91E4-7EF32DC2FE1B}
AppName=POS Aguacates
AppVersion=1.1.11
AppPublisher=Yahir Arceo
VersionInfoCompany=Yahir Arceo
VersionInfoDescription=Instalador de POS Aguacates
VersionInfoProductName=POS Aguacates
VersionInfoProductVersion=1.1.11
DefaultDirName={autopf}\POS Aguacates
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\dist
OutputBaseFilename=POS-HASS-Offline-Setup-1.1.11
Compression=lzma2
SolidCompression=yes
[Files]
Source: "{#StageDir}\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion; Check: IsCleanInstall
Source: "{#StageDir}\*"; DestDir: "{app}\staging\1.1.11"; Flags: recursesubdirs createallsubdirs ignoreversion; Check: IsExistingInstall
[Icons]
Name: "{commondesktop}\POS Aguacates"; Filename: "http://127.0.0.1:3000/"; Comment: "Abrir POS Aguacates"
Name: "{commonprograms}\POS Aguacates\POS Aguacates"; Filename: "http://127.0.0.1:3000/"; Comment: "Abrir POS Aguacates"
[UninstallRun]
Filename: "{app}\service\POSAguacates.exe"; Parameters: "stop"; Flags: runhidden; RunOnceId: "StopService"
Filename: "{app}\service\POSAguacates.exe"; Parameters: "uninstall"; Flags: runhidden; RunOnceId: "RemoveService"

[Code]
var
  DatabasePage: TInputQueryWizardPage;
  AdminPage: TInputQueryWizardPage;
  ExistingInstall: Boolean;
  RegisteredInstall: Boolean;
  LegacyInstall: Boolean;
  LegacyPath: String;

function FindExistingInstall: Boolean;
var
  InstallPath: String;
  UninstallKey: String;
begin
  Result := False;
  UninstallKey := 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{C4F4BDB3-922F-4AD5-91E4-7EF32DC2FE1B}_is1';
  if not RegQueryStringValue(HKLM64, UninstallKey, 'InstallLocation', InstallPath) then
    RegQueryStringValue(HKLM32, UninstallKey, 'InstallLocation', InstallPath);
  if InstallPath = '' then
    exit;
  Result := FileExists(AddBackslash(InstallPath) + 'app\pos-backend\.env');
end;

function FindLegacyInstall: Boolean;
var
  Candidate: String;
begin
  Result := False;
  Candidate := AddBackslash(ExpandConstant('{userdesktop}')) + 'posaguacates\posaguacates';
  if FileExists(AddBackslash(Candidate) + 'pos-backend\.env') and
     FileExists(AddBackslash(Candidate) + 'pos-backend\index.js') and
     FileExists(AddBackslash(Candidate) + 'pos-frontend\index.html') then begin
    LegacyPath := Candidate;
    Result := True;
    exit;
  end;
  Candidate := AddBackslash(ExpandConstant('{userdesktop}')) + 'posaguacates';
  if FileExists(AddBackslash(Candidate) + 'pos-backend\.env') and
     FileExists(AddBackslash(Candidate) + 'pos-backend\index.js') and
     FileExists(AddBackslash(Candidate) + 'pos-frontend\index.html') then begin
    LegacyPath := Candidate;
    Result := True;
  end;
end;

function GetLegacyPath(Param: String): String;
begin
  Result := LegacyPath;
end;

function IsExistingInstall: Boolean;
begin
  Result := ExistingInstall;
end;

function IsCleanInstall: Boolean;
begin
  Result := not ExistingInstall;
end;

function IsRegisteredInstall: Boolean;
begin
  Result := RegisteredInstall;
end;

function IsLegacyInstall: Boolean;
begin
  Result := LegacyInstall;
end;

procedure InitializeWizard;
begin
  { The application directory constant is unavailable in this early callback.
    Inno's uninstall registry entry is authoritative at this stage. }
  RegisteredInstall := FindExistingInstall;
  LegacyInstall := (not RegisteredInstall) and FindLegacyInstall;
  ExistingInstall := RegisteredInstall or LegacyInstall;
  DatabasePage := CreateInputQueryPage(wpSelectDir,
    'Configuracion de la base de datos',
    'Capture los datos que usara POS Aguacates.',
    'Si MariaDB ya esta instalado, escriba su contrasena actual de root. En una computadora nueva, esta sera la nueva contrasena de MariaDB.');
  DatabasePage.Add('Contrasena de MariaDB (root):', True);
  DatabasePage.Add('Nombre de la base:', False);
  DatabasePage.Add('Usuario interno del POS:', False);
  DatabasePage.Values[1] := 'posaguacates';
  DatabasePage.Values[2] := 'pos_app';

  AdminPage := CreateInputQueryPage(DatabasePage.ID,
    'Primer administrador',
    'Cree la cuenta con la que iniciara sesion en el POS.',
    'Escriba y confirme la contrasena que desea usar para iniciar sesion.');
  AdminPage.Add('Nombre:', False);
  AdminPage.Add('Usuario:', False);
  AdminPage.Add('Contrasena:', True);
  AdminPage.Add('Confirmar contrasena:', True);
  AdminPage.Values[0] := 'Administrador';
  AdminPage.Values[1] := 'admin';
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := ExistingInstall and ((PageID = DatabasePage.ID) or (PageID = AdminPage.ID));
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = DatabasePage.ID then begin
    if (DatabasePage.Values[1] = '') or (DatabasePage.Values[2] = '') then begin
      MsgBox('El nombre de la base y el usuario interno son obligatorios.', mbError, MB_OK); Result := False; exit;
    end;
    if DatabasePage.Values[0] = '' then begin
      MsgBox('La contrasena de MariaDB no puede quedar vacia.', mbError, MB_OK); Result := False; exit;
    end;
  end;
  if CurPageID = AdminPage.ID then begin
    if (AdminPage.Values[0] = '') or (AdminPage.Values[1] = '') then begin
      MsgBox('El nombre y usuario del administrador son obligatorios.', mbError, MB_OK); Result := False; exit;
    end;
    if AdminPage.Values[2] = '' then begin
      MsgBox('La contrasena del administrador no puede quedar vacia.', mbError, MB_OK); Result := False; exit;
    end;
    if AdminPage.Values[2] <> AdminPage.Values[3] then begin
      MsgBox('Las contrasenas del administrador no coinciden.', mbError, MB_OK); Result := False; exit;
    end;
  end;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  Config: String;
begin
  Config := 'DB_ROOT_PASSWORD=' + DatabasePage.Values[0] + #13#10 +
    'DB_NAME=' + DatabasePage.Values[1] + #13#10 +
    'APP_USER=' + DatabasePage.Values[2] + #13#10 +
    'ADMIN_NAME=' + AdminPage.Values[0] + #13#10 +
    'ADMIN_USER=' + AdminPage.Values[1] + #13#10 +
    'ADMIN_PASSWORD=' + AdminPage.Values[2] + #13#10;
  if not SaveStringToFile(ExpandConstant('{tmp}\pos-install.cfg'), Config, False) then
    Result := 'No fue posible preparar la configuracion del instalador.'
  else
    Result := '';
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  Parameters: String;
  ResultCode: Integer;
begin
  if CurStep <> ssPostInstall then
    exit;

  ResultCode := -1;

  if IsCleanInstall then
    Parameters := '-NoProfile -ExecutionPolicy Bypass -File "' + ExpandConstant('{app}\instalar.ps1') +
      '" -ConfigPath "' + ExpandConstant('{tmp}\pos-install.cfg') + '"'
  else if IsRegisteredInstall then
    Parameters := '-NoProfile -ExecutionPolicy Bypass -File "' + ExpandConstant('{app}\staging\1.1.11\actualizar.ps1') +
      '" -BasePath "' + ExpandConstant('{app}') + '" -StagingPath "' +
      ExpandConstant('{app}\staging\1.1.11') + '"'
  else
    Parameters := '-NoProfile -ExecutionPolicy Bypass -File "' + ExpandConstant('{app}\staging\1.1.11\migrar-legacy.ps1') +
      '" -BasePath "' + ExpandConstant('{app}') + '" -StagingPath "' +
      ExpandConstant('{app}\staging\1.1.11') + '" -LegacyPath "' + LegacyPath + '"';

  if (not Exec('powershell.exe', Parameters, ExpandConstant('{app}'), SW_HIDE,
      ewWaitUntilTerminated, ResultCode)) or (ResultCode <> 0) then
    RaiseException(Format('La instalacion del POS no termino correctamente (codigo %d). La instalacion anterior no fue eliminada.', [ResultCode]));
end;
