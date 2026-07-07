const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withFmtFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const file = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      // If the Podfile doesn't exist, we just return
      if (!fs.existsSync(file)) {
        return config;
      }

      let contents = fs.readFileSync(file, 'utf8');

      const fixCode = `
    # Fix for Xcode 16 fmt consteval build error
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |config|
          config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end
`;

      // Insert the code right after react_native_post_install
      if (!contents.includes("target.name == 'fmt'")) {
        contents = contents.replace(
          /(react_native_post_install\([^)]+\))/s,
          `$1\n${fixCode}`
        );
        fs.writeFileSync(file, contents);
      }
      return config;
    },
  ]);
};

module.exports = withFmtFix;
