'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'export' to the target_resource_type enum
    await queryInterface.sequelize.query(`
      ALTER TYPE enum_audit_logs_target_resource_type ADD VALUE 'export';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing enum values directly
    // This would require recreating the enum type, which is complex
    // For now, we'll leave the 'export' value in the enum
    console.log('⚠️  Cannot remove enum value "export" - would require recreating enum type');
  }
};
