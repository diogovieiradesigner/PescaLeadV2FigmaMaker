import svgPaths from "./svg-cc05ygyls5";

export default function LogoPescaLeadBranca() {
  return (
    <div className="flex items-center h-full w-full gap-2 select-none" data-name="LOGO PESCA LEAD - BRANCA">
      {/* Ícone SVG */}
      <div className="h-full py-0.5 w-auto aspect-[680/977] flex-shrink-0">
        <svg className="w-full h-full" viewBox="0 0 680 977" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
          <g id="Vector">
            <mask fill="white" id="path-1-inside-1_56_55">
              <path d={svgPaths.p3908d4f0} />
            </mask>
            <path d={svgPaths.p3908d4f0} fill="url(#paint0_linear_56_55)" />
            <path d={svgPaths.p154c700} fill="url(#paint1_linear_56_55)" mask="url(#path-1-inside-1_56_55)" />
          </g>
          <defs>
            <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_56_55" x1="789.729" x2="573.209" y1="8.46969e-06" y2="677.646">
              <stop stopColor="#0169D9" />
              <stop offset="1" stopColor="#00CFFA" />
            </linearGradient>
            <linearGradient gradientUnits="userSpaceOnUse" id="paint1_linear_56_55" x1="-40.7057" x2="679.889" y1="788.82" y2="196.568">
              <stop stopColor="#0169D9" />
              <stop offset="1" stopColor="#00CFFA" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Texto */}
      <div className="flex items-center font-['Montserrat',sans-serif] font-bold tracking-wide mt-0.5">
        <p className="text-[18px] leading-none text-white m-0 font-medium">PESCA</p>
        <span className="text-[18px] leading-none m-0 ml-1.5 text-transparent bg-clip-text bg-gradient-to-r from-[#0169D9] to-[#00CFFA] font-bold">
          LEAD
        </span>
      </div>
    </div>
  );
}
