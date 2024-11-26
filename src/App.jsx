import { useState, useEffect } from "react";
import axios from "axios";
import { Moon, Sun, Upload, FileText, Check, X } from "lucide-react";

function App() {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (analysisResult && analysisResult.score) {
      setProgressBarWidth(analysisResult.score);
    }
  }, [analysisResult]);

  // Handle file input change
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setUploadMessage("");
    } else {
      setFile(null);
      setUploadMessage("Please upload a valid PDF file.");
    }
  };

  // Handle job description change
  const handleJobDescriptionChange = (e) => {
    setJobDescription(e.target.value);
    setUploadMessage("");
  };

  // Handle file upload and analysis
  const handleUpload = async () => {
    // Reset previous state
    setUploadMessage("");
    setAnalysisResult(null);

    if (!file) {
      setUploadMessage("Please upload a PDF resume.");
      return;
    }

    if (!jobDescription.trim()) {
      setUploadMessage("Please provide a job description.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("jobDescription", jobDescription);

    try {
      const response = await axios.post(
        "http://localhost:4000/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      if (response.data.success) {
        const analysisData = response.data.analysis?.choices?.[0]?.message
          ?.content
          ? JSON.parse(response.data.analysis.choices[0].message.content)
          : response.data.analysis;

        setAnalysisResult(analysisData);
      } else {
        setUploadMessage(
          response.data.message ||
            "Failed to analyze the resume. Please try again."
        );
      }
    } catch (error) {
      console.error("Error uploading or analyzing file:", error);
      if (error.response) {
        setUploadMessage(
          error.response.data.message || "Server error. Please try again."
        );
      } else if (error.request) {
        setUploadMessage(
          "No response from server. Please check your connection."
        );
      } else {
        setUploadMessage("Error processing your request. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle downloading PDF
  const handleDownloadPdf = async () => {
    try {
      const response = await axios.post(
        "http://localhost:4000/download-analysis",
        { analysis_result: analysisResult },
        {
          responseType: "blob",
        }
      );
  
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "analysis_result.pdf");
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error("Error downloading PDF:", error);
      setUploadMessage(
        "Failed to download the analysis result. Please try again."
      );
    }
  };
  console.log(analysisResult);
  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 
      ${
        darkMode ? "bg-[#1E1E1E] text-[#E0E0E0]" : "bg-[#e6f0ef] text-[#010b0e]"
      }`}
    >
      {/* Theme Toggle Button */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`absolute top-4 right-4 p-2 rounded-full transition-colors duration-300 
          ${
            darkMode
              ? "bg-[#008080] text-[#FFFFFF] hover:bg-[#9dd9a7]"
              : "bg-[#416362] text-[#e6f0ef] hover:bg-[#56b88e]"
          }`}
      >
        {darkMode ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      <div
        className={`w-full max-w-md p-6 rounded-lg shadow-xl transition-all duration-300
        ${
          darkMode
            ? "bg-[#2E2E2E] border border-[#56b88e]"
            : "bg-white border border-[#afcfc6]"
        }`}
      >
        <h1
          className={`text-3xl font-bold mb-6 text-center 
          ${darkMode ? "text-[#FFFFFF]" : "text-[#56b88e]"}`}
        >
          Resume Analyzer
        </h1>

        {/* File Upload */}
        <div className="mb-4">
        <label className="block mb-2 font-semibold">Upload Resume (PDF):</label>
        <div 
          className={`flex flex-col items-center justify-center w-full p-3 border-2 rounded-lg cursor-pointer transition-colors 
            ${darkMode 
              ? 'border-[#56b88e] text-[#E0E0E0] hover:bg-[#56b88e]/20' 
              : 'border-[#416362] text-[#010b0e] hover:bg-[#afcfc6]/20'
            } 
            ${isDragging ? 'bg-gray-200/20' : ''}
          `}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);

            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile && droppedFile.type === 'application/pdf') {
              handleFileChange({ target: { files: [droppedFile] } });
            } else {
              alert('Please upload a valid PDF file.');
            }
          }}
        >
          <input 
            type="file" 
            accept=".pdf" 
            onChange={handleFileChange} 
            className="hidden" 
            id="file-upload"
          />
          <label htmlFor="file-upload" className="flex items-center justify-center w-full">
            <Upload className="mr-2" />
            {file ? file.name : (isDragging ? 'Drop file here' : 'Choose or drag a PDF file')}
          </label>
        </div>
      </div>
        {/* Job Description */}
        <div className="mb-4">
          <label className="block mb-2 font-semibold">Job Description:</label>
          <textarea
            value={jobDescription}
            onChange={handleJobDescriptionChange}
            placeholder="Enter the job description here"
            className={`w-full p-3 border-2 rounded-lg h-32 transition-colors 
              ${
                darkMode
                  ? "bg-[#2E2E2E] border-[#56b88e] text-[#E0E0E0] focus:ring-[#9dd9a7]"
                  : "bg-white border-[#416362] text-[#010b0e] focus:ring-[#56b88e]"
              }`}
          />
        </div>

        {/* Upload Button */}
        <div className="mb-4 text-center">
          <button
            onClick={handleUpload}
            disabled={loading}
            className={`w-full py-3 rounded-lg transition-all duration-300 flex items-center justify-center 
              ${loading ? "cursor-not-allowed opacity-50" : "hover:opacity-90"} 
              ${
                darkMode
                  ? "bg-[#008080] text-[#FFFFFF]"
                  : "bg-[#416362] text-[#e6f0ef]"
              }`}
          >
            {loading ? (
              <>
                <FileText className="mr-2 animate-pulse" />
                Analyzing...
              </>
            ) : (
              "Analyze Resume"
            )}
          </button>
        </div>

        {/* Upload Message */}
        {uploadMessage && (
          <div
            className={`flex items-center justify-center p-3 rounded-lg mb-4 
            ${
              uploadMessage.includes("error") ||
              uploadMessage.includes("Please")
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {uploadMessage.includes("error") ||
            uploadMessage.includes("Please") ? (
              <X className="mr-2" />
            ) : (
              <Check className="mr-2" />
            )}
            {uploadMessage}
          </div>
        )}

        {/* Analysis Result */}
        {analysisResult && (
          <div
            className={`p-4 rounded-lg shadow-md 
            ${
              darkMode
                ? "bg-[#1E1E1E] border border-[#9dd9a7]"
                : "bg-[#afcfc6]/20 border border-[#56b88e]"
            }`}
          >
            <h2
              className={`text-xl font-semibold mb-3 
              ${darkMode ? "text-[#FFFFFF]" : "text-[#416362]"}`}
            >
              Analysis Result
            </h2>

            <div className="space-y-3">
              <div
                className={`p-3 rounded-lg 
                ${
                  darkMode
                    ? "bg-[#2E2E2E]"
                    : "bg-white border border-[#56b88e]/30"
                }`}
              >
                <h3 className="font-bold">
                  Resume Score:
                  <span
                    className={`ml-2 
                    ${
                      analysisResult.score > 7
                        ? "text-green-500"
                        : analysisResult.score > 4
                        ? "text-yellow-500"
                        : "text-red-500"
                    }`}
                  >
                    {analysisResult.score || "N/A"}
                  </span>
                </h3>

                <div className="mt-2">
                  {/* Progress Bar */}
                  <div className="relative pt-1">
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-green-200">
                      <div
                        style={{ width: `${progressBarWidth}%` }}
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center 
                          ${
                            analysisResult?.score > 7
                              ? "bg-green-500"
                              : analysisResult?.score > 4
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {analysisResult.highlights && (
                <div
                  className={`p-3 rounded-lg 
                  ${
                    darkMode
                      ? "bg-[#2E2E2E]"
                      : "bg-white border border-[#56b88e]/30"
                  }`}
                >
                  <strong
                    className={darkMode ? "text-[#E0E0E0]" : "text-[#416362]"}
                  >
                    Highlights:
                  </strong>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {analysisResult.highlights.map((highlight, index) => (
                      <li key={index} className="text-sm">
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisResult.recommendations && (
                <div
                  className={`p-3 rounded-lg 
                  ${
                    darkMode
                      ? "bg-[#2E2E2E]"
                      : "bg-white border border-[#56b88e]/30"
                  }`}
                >
                  <strong
                    className={darkMode ? "text-[#E0E0E0]" : "text-[#416362]"}
                  >
                    Recommendations:
                  </strong>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {analysisResult.recommendations.map(
                      (recommendation, index) => (
                        <li key={index} className="text-sm">
                          {recommendation}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
            <button
              onClick={handleDownloadPdf}
              className={`w-full mt-4 py-2 rounded-lg transition-colors 
                ${
                  darkMode
                    ? "bg-[#008080] text-[#FFFFFF]"
                    : "bg-[#416362] text-[#e6f0ef]"
                }`}
            >
              Download PDF Analysis
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
