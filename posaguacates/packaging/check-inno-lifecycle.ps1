param([Parameter(Mandatory=$true)][string]$ScriptPath)
$ErrorActionPreference='Stop'
$source=Get-Content -LiteralPath $ScriptPath -Raw

# Inno initializes {app} only after the early setup callbacks. This guard covers
# direct use in both callbacks. Indirect calls still require code review because
# Pascal Script cannot be resolved reliably with a regular-expression parser.
foreach($callback in @('InitializeSetup','InitializeWizard')){
  $pattern='(?is)\b(?:function|procedure)\s+'+[regex]::Escape($callback)+'\b.*?\bbegin\b(?<body>.*?)\bend\s*;'
  $match=[regex]::Match($source,$pattern)
  if($match.Success -and $match.Groups['body'].Value -match '(?i)\{app\}'){
    throw "Uso prematuro de {app} detectado dentro de $callback en $ScriptPath"
  }
}
Write-Host 'Verificación Inno correcta: los callbacks tempranos no usan {app} directamente.'
