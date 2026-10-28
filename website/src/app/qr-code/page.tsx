"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { Download, Printer, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const QR_DESTINATION = "https://hashview.co.uk/qr";

export default function QRCodeGeneratorPage() {
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDownloadPNG = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current.querySelector("canvas");
    if (!canvas) return;

    const pngUrl = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = "HashView-QR-Code.png";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handleDownloadSVG = () => {
    const svgNode = document.getElementById("hashview-qr-svg");
    if (!svgNode) return;
    
    const svgData = new XMLSerializer().serializeToString(svgNode);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = "HashView-QR-Code.svg";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4 print:bg-white print:py-0 print:px-0">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Page Header (Hidden in Print) */}
        <div className="text-center print:hidden">
          <h1 className="text-3xl font-display font-bold mb-2">HashView QR Code Generator</h1>
          <p className="text-muted-foreground">
            Generate and download the official HashView QR code for print and digital materials.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-card border border-border rounded-3xl p-8 md:p-12 shadow-sm text-center print:border-none print:shadow-none print:p-0">
          
          {/* Brand Header */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center p-3 mb-4 border border-gray-100">
              <Image src={logo} alt="HashView Logo" width={64} height={64} className="w-full h-auto" />
            </div>
            <h2 className="font-display text-2xl font-bold">HashView</h2>
            <p className="text-muted-foreground mt-1">Scan to explore HashView</p>
          </div>

          {/* QR Code Container */}
          <div className="flex justify-center mb-8 relative group">
            {/* SVG Version (Visible) */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <QRCodeSVG
                id="hashview-qr-svg"
                value={QR_DESTINATION}
                size={256}
                level="H"
                includeMargin={true}
                imageSettings={{
                  src: logo.src,
                  x: undefined,
                  y: undefined,
                  height: 48,
                  width: 48,
                  excavate: true,
                }}
              />
            </div>

            {/* Hidden Canvas Version (For PNG Download) */}
            <div ref={canvasRef} className="hidden">
              <QRCodeCanvas
                value={QR_DESTINATION}
                size={1024} // High res for PNG export
                level="H"
                includeMargin={true}
                imageSettings={{
                  src: logo.src,
                  x: undefined,
                  y: undefined,
                  height: 192,
                  width: 192,
                  excavate: true,
                }}
              />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary rounded-full text-sm font-medium text-muted-foreground mb-8">
            <ExternalLink size={16} />
            <a href={QR_DESTINATION} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
              {QR_DESTINATION}
            </a>
          </div>

          {/* Actions (Hidden in Print) */}
          <div className="flex flex-wrap justify-center gap-4 print:hidden">
            <Button onClick={handleDownloadPNG} variant="default" className="gap-2">
              <Download size={18} />
              Download PNG
            </Button>
            <Button onClick={handleDownloadSVG} variant="outline" className="gap-2">
              <Download size={18} />
              Download SVG
            </Button>
            <Button onClick={handlePrint} variant="secondary" className="gap-2">
              <Printer size={18} />
              Print QR Code
            </Button>
          </div>
        </div>
      </div>
      
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #hashview-qr-svg, #hashview-qr-svg *, .bg-card, .bg-card * {
            visibility: visible;
          }
          .bg-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
          }
        }
      `}} />
    </div>
  );
}
