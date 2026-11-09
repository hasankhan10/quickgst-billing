using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;

class QuickGSTLauncher
{
    [STAThread]
    static void Main()
    {
        try
        {
            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            string systemDir = Path.Combine(exeDir, "_system");
            if (!Directory.Exists(systemDir))
            {
                systemDir = exeDir;
            }

            int port = 47371;
            string portFile = Path.Combine(systemDir, "data", "port.txt");
            if (File.Exists(portFile))
            {
                int.TryParse(File.ReadAllText(portFile).Trim(), out port);
            }
            if (port < 1024 || port > 65535) port = 47371;

            string targetUrl = "http://localhost:" + port + "/";

            // Check if server is already running
            bool isRunning = IsPortOpen("127.0.0.1", port);

            if (!isRunning)
            {
                // Find node.exe in _system or system PATH
                string nodeExe = Path.Combine(systemDir, "node.exe");
                if (!File.Exists(nodeExe)) nodeExe = Path.Combine(systemDir, "node", "node.exe");
                if (!File.Exists(nodeExe)) nodeExe = Path.Combine(systemDir, "bin", "node.exe");
                if (!File.Exists(nodeExe)) nodeExe = "node";

                string serverScript = Path.Combine(systemDir, "server.js");

                // Start node server silently
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = nodeExe;
                psi.Arguments = "\"" + serverScript + "\"";
                psi.WorkingDirectory = systemDir;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                psi.WindowStyle = ProcessWindowStyle.Hidden;

                bool started = false;
                try
                {
                    Process.Start(psi);
                    started = true;
                }
                catch
                {
                    started = false;
                }

                if (!started)
                {
                    // Fallback to powershell start-windows.ps1
                    string psScript = Path.Combine(systemDir, "start-windows.ps1");
                    if (File.Exists(psScript))
                    {
                        ProcessStartInfo psPsi = new ProcessStartInfo();
                        psPsi.FileName = "powershell.exe";
                        psPsi.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"" + psScript + "\" -NoWindow -Hidden";
                        psPsi.WorkingDirectory = systemDir;
                        psPsi.CreateNoWindow = true;
                        psPsi.UseShellExecute = false;
                        Process.Start(psPsi);
                    }
                }

                // Wait up to 10s for port to open
                for (int i = 0; i < 20; i++)
                {
                    Thread.Sleep(500);
                    if (IsPortOpen("127.0.0.1", port))
                    {
                        break;
                    }
                }
            }

            // Launch Edge in app mode (looks like a real desktop application) or default browser
            string edgeExe = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe");
            if (!File.Exists(edgeExe))
            {
                edgeExe = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe");
            }

            if (File.Exists(edgeExe))
            {
                ProcessStartInfo edgePsi = new ProcessStartInfo();
                edgePsi.FileName = edgeExe;
                edgePsi.Arguments = "--app=" + targetUrl;
                Process.Start(edgePsi);
            }
            else
            {
                Process.Start(new ProcessStartInfo(targetUrl) { UseShellExecute = true });
            }

            // Ensure desktop shortcut is created
            CreateDesktopShortcut(exeDir);
        }
        catch (Exception ex)
        {
            MessageBox.Show("Could not start QuickGST Billing:\n" + ex.Message, "QuickGST Billing", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    static bool IsPortOpen(string host, int port)
    {
        try
        {
            using (TcpClient client = new TcpClient())
            {
                IAsyncResult result = client.BeginConnect(host, port, null, null);
                bool success = result.AsyncWaitHandle.WaitOne(600);
                if (success)
                {
                    client.EndConnect(result);
                    return true;
                }
                return false;
            }
        }
        catch { return false; }
    }

    static void CreateDesktopShortcut(string exeDir)
    {
        try
        {
            string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            string shortcutPath = Path.Combine(desktop, "QuickGST Billing.lnk");
            if (!File.Exists(shortcutPath))
            {
                string targetExe = Path.Combine(exeDir, "QuickGST.exe");
                string iconPath = Path.Combine(exeDir, "_system", "app-icon.ico");
                if (!File.Exists(iconPath)) iconPath = targetExe;

                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    dynamic shell = Activator.CreateInstance(shellType);
                    dynamic shortcut = shell.CreateShortcut(shortcutPath);
                    shortcut.TargetPath = targetExe;
                    shortcut.WorkingDirectory = exeDir;
                    shortcut.Description = "QuickGST Billing - Built by Stova Media";
                    shortcut.IconLocation = iconPath + ",0";
                    shortcut.Save();
                }
            }
        }
        catch { /* best effort */ }
    }
}
