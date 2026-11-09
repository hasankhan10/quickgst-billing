using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

class GenerateIcons
{
    static void Main()
    {
        int[] sizes = new int[] { 512, 256, 192, 180, 64, 48, 32, 16 };
        Bitmap[] bitmaps = new Bitmap[sizes.Length];

        for (int i = 0; i < sizes.Length; i++)
        {
            bitmaps[i] = DrawIcon(sizes[i]);
        }

        string root = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, ".."));
        string publicIcons = Path.Combine(root, "public", "icons");
        Directory.CreateDirectory(publicIcons);

        // Save PNGs
        bitmaps[0].Save(Path.Combine(publicIcons, "icon-512.png"), ImageFormat.Png);
        bitmaps[0].Save(Path.Combine(publicIcons, "maskable-512.png"), ImageFormat.Png);
        bitmaps[2].Save(Path.Combine(publicIcons, "icon-192.png"), ImageFormat.Png);
        bitmaps[2].Save(Path.Combine(publicIcons, "maskable-192.png"), ImageFormat.Png);
        bitmaps[3].Save(Path.Combine(publicIcons, "apple-touch-180.png"), ImageFormat.Png);

        // Save ICO with 256, 48, 32, 16
        Bitmap[] icoBitmaps = new Bitmap[] { bitmaps[1], bitmaps[5], bitmaps[6], bitmaps[7] };
        byte[] icoBytes = BuildIco(icoBitmaps);

        string templateIco = Path.Combine(root, "release-templates", "_system-scripts", "app-icon.ico");
        File.WriteAllBytes(templateIco, icoBytes);
        Console.WriteLine("Saved: " + templateIco);

        string publicIco = Path.Combine(root, "public", "app-icon.ico");
        File.WriteAllBytes(publicIco, icoBytes);
        Console.WriteLine("Saved: " + publicIco);

        Console.WriteLine("All icons generated successfully!");
    }

    static Bitmap DrawIcon(int size)
    {
        Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.Clear(Color.Transparent);

            float scale = size / 512f;

            // 1. Squircle Background
            float cornerRadius = 110f * scale;
            RectangleF bgRect = new RectangleF(10 * scale, 10 * scale, 492 * scale, 492 * scale);
            using (GraphicsPath bgPath = RoundedRect(bgRect, cornerRadius))
            using (LinearGradientBrush bgBrush = new LinearGradientBrush(bgRect, Color.FromArgb(24, 32, 47), Color.FromArgb(7, 11, 20), 45f))
            {
                g.FillPath(bgBrush, bgPath);
                using (Pen borderPen = new Pen(Color.FromArgb(100, 71, 85, 105), 4 * scale))
                {
                    g.DrawPath(borderPen, bgPath);
                }
            }

            // 2. Geometric "Q" Body Ring
            float ringThickness = 38 * scale;
            RectangleF ringRect = new RectangleF(96 * scale, 86 * scale, 300 * scale, 300 * scale);
            using (LinearGradientBrush emeraldBrush = new LinearGradientBrush(ringRect, Color.FromArgb(52, 211, 153), Color.FromArgb(5, 150, 105), 45f))
            using (Pen ringPen = new Pen(emeraldBrush, ringThickness))
            {
                ringPen.StartCap = LineCap.Round;
                ringPen.EndCap = LineCap.Round;
                g.DrawArc(ringPen, ringRect, -50, 310);
            }

            // 3. "Q" Kick Tail (Electric Amber / Gold)
            using (LinearGradientBrush amberBrush = new LinearGradientBrush(new RectangleF(300 * scale, 300 * scale, 140 * scale, 140 * scale), Color.FromArgb(253, 224, 71), Color.FromArgb(245, 158, 11), 45f))
            using (Pen amberPen = new Pen(amberBrush, 42 * scale))
            {
                amberPen.StartCap = LineCap.Round;
                amberPen.EndCap = LineCap.Round;
                g.DrawLine(amberPen, 320 * scale, 310 * scale, 415 * scale, 405 * scale);
            }

            // 4. White accent in the tail
            using (Pen whitePen = new Pen(Color.FromArgb(220, 255, 255, 255), 10 * scale))
            {
                whitePen.StartCap = LineCap.Round;
                whitePen.EndCap = LineCap.Round;
                g.DrawLine(whitePen, 328 * scale, 318 * scale, 385 * scale, 375 * scale);
            }

            // 5. Indian Rupee Symbol (₹) in crisp center
            using (Pen rupeePen = new Pen(Color.White, 20 * scale))
            {
                rupeePen.StartCap = LineCap.Round;
                rupeePen.EndCap = LineCap.Round;
                rupeePen.LineJoin = LineJoin.Round;

                // Upper bar
                g.DrawLine(rupeePen, 195 * scale, 175 * scale, 295 * scale, 175 * scale);
                // Lower bar
                g.DrawLine(rupeePen, 195 * scale, 215 * scale, 280 * scale, 215 * scale);

                // Stem
                g.DrawLine(rupeePen, 235 * scale, 175 * scale, 235 * scale, 260 * scale);

                // Upper curved loop of ₹
                using (GraphicsPath arcPath = new GraphicsPath())
                {
                    arcPath.AddArc(200 * scale, 175 * scale, 75 * scale, 85 * scale, -90, 180);
                    g.DrawPath(rupeePen, arcPath);
                }

                // Diagonal leg of ₹
                g.DrawLine(rupeePen, 235 * scale, 260 * scale, 295 * scale, 325 * scale);
            }

            // Accent Sparkles
            using (SolidBrush dot1 = new SolidBrush(Color.FromArgb(200, 52, 211, 153)))
                g.FillEllipse(dot1, 110 * scale, 120 * scale, 14 * scale, 14 * scale);

            using (SolidBrush dot2 = new SolidBrush(Color.FromArgb(220, 253, 224, 71)))
                g.FillEllipse(dot2, 400 * scale, 140 * scale, 10 * scale, 10 * scale);
        }
        return bmp;
    }

    static GraphicsPath RoundedRect(RectangleF bounds, float radius)
    {
        float diameter = radius * 2;
        SizeF size = new SizeF(diameter, diameter);
        RectangleF arc = new RectangleF(bounds.Location, size);
        GraphicsPath path = new GraphicsPath();

        // top left arc
        path.AddArc(arc, 180, 90);
        // top right arc
        arc.X = bounds.Right - diameter;
        path.AddArc(arc, 270, 90);
        // bottom right arc
        arc.Y = bounds.Bottom - diameter;
        path.AddArc(arc, 0, 90);
        // bottom left arc
        arc.X = bounds.Left;
        path.AddArc(arc, 90, 90);

        path.CloseFigure();
        return path;
    }

    static byte[] BuildIco(Bitmap[] images)
    {
        using (MemoryStream ms = new MemoryStream())
        using (BinaryWriter bw = new BinaryWriter(ms))
        {
            // ICONDIR
            bw.Write((ushort)0); // Reserved
            bw.Write((ushort)1); // Type 1 = ICO
            bw.Write((ushort)images.Length); // Count

            byte[][] pngData = new byte[images.Length][];
            for (int i = 0; i < images.Length; i++)
            {
                using (MemoryStream imgMs = new MemoryStream())
                {
                    images[i].Save(imgMs, ImageFormat.Png);
                    pngData[i] = imgMs.ToArray();
                }
            }

            int headerSize = 6 + (16 * images.Length);
            int offset = headerSize;

            for (int i = 0; i < images.Length; i++)
            {
                int w = images[i].Width;
                int h = images[i].Height;
                bw.Write((byte)(w >= 256 ? 0 : w));
                bw.Write((byte)(h >= 256 ? 0 : h));
                bw.Write((byte)0); // Colors
                bw.Write((byte)0); // Reserved
                bw.Write((ushort)1); // Planes
                bw.Write((ushort)32); // BPP
                bw.Write((uint)pngData[i].Length); // Size
                bw.Write((uint)offset); // Offset
                offset += pngData[i].Length;
            }

            for (int i = 0; i < images.Length; i++)
            {
                bw.Write(pngData[i]);
            }

            return ms.ToArray();
        }
    }
}
