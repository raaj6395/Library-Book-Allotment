export function libraryEmailTemplate({ title, body }) {
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#f4f6f8; padding:20px;">
    
    <table align="center" width="650" style="background:white;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
      
      <!-- HEADER -->
      <tr>
        <td style="background:#0f172a;color:white;padding:20px;">
          <table width="100%">
            <tr>
              <td width="80">
                <img src="https://mnnit.ac.in/ss/images/logo.png"
                     alt="MNNIT Logo"
                     style="height:60px;">
              </td>
              <td>
                <h2 style="margin:0;font-size:20px;">
                  Motilal Nehru National Institute of Technology
                </h2>
                <p style="margin:2px 0;font-size:14px;">
                  Central Library
                </p>
                <p style="margin:2px 0;font-size:12px;color:#cbd5f5;">
                  Prayagraj (Allahabad), Uttar Pradesh - 211004
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- TITLE -->
      <tr>
        <td style="padding:20px 30px 0 30px;">
          <h3 style="margin:0;color:#111827;">${title}</h3>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td style="padding:20px 30px 30px 30px;font-size:15px;color:#1f2937;line-height:1.6;">
          ${body}
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#f1f5f9;padding:20px;font-size:13px;color:#475569;">
          <p style="margin:0;"><strong>Central Library</strong></p>
          <p style="margin:4px 0;">Motilal Nehru National Institute of Technology</p>
          <p style="margin:4px 0;">Prayagraj, Uttar Pradesh – 211004</p>

          <p style="margin:6px 0;">
            Website:
            <a href="https://www.mnnit.ac.in" style="color:#2563eb;">
              www.mnnit.ac.in
            </a>
          </p>

          <hr style="margin:12px 0;border:none;border-top:1px solid #e2e8f0;">

          <p style="font-size:12px;color:#64748b;margin:0;">
            This is an automated message from the Library Book Allotment System.
            Please do not reply to this email.
          </p>
        </td>
      </tr>

    </table>

  </div>
  `;
}