/**
 * Google AdSense placeholder.
 * Replace data-ad-client and data-ad-slot with your values after approval.
 */
export default function AdSlot({ format = "auto", style = {} }) {
  return (
    <div className="my-8 flex justify-center">
      <ins className="adsbygoogle"
        style={{ display: "block", width: "100%", minHeight: 90, ...style }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXX"
        data-ad-slot="1234567890"
        data-ad-format={format}
        data-full-width-responsive="true"
      />
      {/* <script>
        (adsbygoogle = window.adsbygoogle || []).push({});
      </script> */}
    </div>
  );
}
