[Setup]
AppId={{C4F4BDB3-922F-4AD5-91E4-7EF32DC2FE1B}
AppName=POS Aguacates
AppVersion=1.1.5
AppPublisher=POS Aguacates
VersionInfoCompany=POS Aguacates
VersionInfoDescription=Instalador de POS Aguacates
VersionInfoProductName=POS Aguacates
VersionInfoProductVersion=1.1.5
DefaultDirName={autopf}\POS Aguacates
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\dist
OutputBaseFilename=POS-HASS-Offline-Setup-1.1.5
Compression=lzma2
SolidCompression=yes
[Files]
Source: "..\dist\POS-Aguacates-1.1.5\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion
[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\instalar.ps1"" -ConfigPath ""{tmp}\pos-install.cfg"""; WorkingDir: "{app}"; StatusMsg: "Creando la base de datos e iniciando POS Aguacates..."; Flags: waituntilterminated runhidden
[UninstallRun]
Filename: "{app}\service\POSAguacates.exe"; Parameters: "stop"; Flags: runhidden; RunOnceId: "StopService"
Filename: "{app}\service\POSAguacates.exe"; Parameters: "uninstall"; Flags: runhidden; RunOnceId: "RemoveService"

[Code]
var
  DatabasePage: TInputQueryWizardPage;
  AdminPage: TInputQueryWizardPage;

procedure InitializeWizard;
begin
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
